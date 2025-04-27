import React from 'react';
import { useAITraining } from '../../contexts/AITrainingContext';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { ScrollArea } from '../ui/scroll-area';
import { Separator } from '../ui/separator';
import { AlertCircle, Check, ClipboardCopy, Edit, Save, Share2, Trash2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { Badge } from '../ui/badge';
import { Alert, AlertDescription } from '../ui/alert';

const AITrainingResult: React.FC = () => {
  const { generatedTraining, clearGeneratedTraining, saveGeneratedTrainingToMyWorkouts, isGenerating } = useAITraining();
  const navigate = useNavigate();

  // Se não há treino gerado ou está em processo de geração, não exibe nada
  if (!generatedTraining || isGenerating) {
    return null;
  }

  // Função para salvar o treino e redirecionar para a edição
  const handleSaveAndEdit = async () => {
    const savedId = await saveGeneratedTrainingToMyWorkouts();
    if (savedId) {
      navigate(`/workouts/${savedId}/edit`);
    }
  };

  // Função para copiar o treino para a área de transferência
  const handleCopyToClipboard = () => {
    const exerciseText = generatedTraining.exercises.map((ex, index) => {
      return `${index + 1}. ${ex.name} - ${ex.sets} séries x ${ex.reps} repetições (descanso: ${ex.rest}s)`;
    }).join('\n');

    const fullText = `${generatedTraining.title}\n\n${generatedTraining.description}\n\nExercícios:\n${exerciseText}`;
    
    navigator.clipboard.writeText(fullText)
      .then(() => toast.success('Treino copiado para a área de transferência!'))
      .catch(() => toast.error('Erro ao copiar treino'));
  };

  // Verificar a origem do treino (IA real ou simulado)
  const isSimulated = generatedTraining.source === 'simulated';

  return (
    <Card className="w-full max-w-3xl mx-auto mt-6">
      <CardHeader>
        <div className="flex items-center justify-between mb-2">
          <CardTitle>{generatedTraining.title}</CardTitle>
          <Badge variant={isSimulated ? "outline" : "default"} className={isSimulated ? "bg-yellow-100 text-yellow-800 hover:bg-yellow-100" : "bg-green-100 text-green-800 hover:bg-green-100"}>
            {isSimulated ? "Simulado" : "Gerado por IA"}
          </Badge>
        </div>
        <CardDescription>
          {generatedTraining.description}
        </CardDescription>
        
        {isSimulated && (
          <Alert className="mt-2 bg-yellow-50 text-yellow-800 border-yellow-200">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              Este treino foi gerado localmente pelo servidor simulado pois o servidor de IA real não está disponível.
            </AlertDescription>
          </Alert>
        )}
      </CardHeader>
      
      <CardContent>
        <ScrollArea className="h-[400px] rounded-md border p-4">
          <div className="space-y-4">
            <h3 className="font-medium text-lg">Exercícios Recomendados</h3>
            
            {generatedTraining.exercises.map((exercise, index) => (
              <div key={index} className="p-3 rounded-lg border bg-card">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-medium">{exercise.name}</h4>
                    <p className="text-sm text-muted-foreground">
                      {exercise.sets} séries x {exercise.reps} repetições
                    </p>
                    <p className="text-xs text-muted-foreground">
                      Descanso: {exercise.rest} segundos
                    </p>
                  </div>
                  <div className="bg-primary/10 text-primary px-2 py-1 rounded-full text-xs">
                    Série {index + 1}
                  </div>
                </div>
                
                {exercise.instructions && (
                  <>
                    <Separator className="my-2" />
                    <div className="text-sm mt-2">
                      <p className="font-medium text-xs mb-1">Instruções:</p>
                      <p className="text-muted-foreground text-xs">{exercise.instructions}</p>
                    </div>
                  </>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      
      <CardFooter className="flex flex-wrap gap-2 justify-between">
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={clearGeneratedTraining}>
            <Trash2 className="h-4 w-4 mr-1" />
            Descartar
          </Button>
          <Button variant="outline" size="sm" onClick={handleCopyToClipboard}>
            <ClipboardCopy className="h-4 w-4 mr-1" />
            Copiar
          </Button>
        </div>
        
        <div className="flex gap-2">
          <Button size="sm" onClick={saveGeneratedTrainingToMyWorkouts}>
            <Save className="h-4 w-4 mr-1" />
            Salvar
          </Button>
          <Button variant="default" size="sm" onClick={handleSaveAndEdit}>
            <Edit className="h-4 w-4 mr-1" />
            Salvar e Editar
          </Button>
        </div>
      </CardFooter>
    </Card>
  );
};

export default AITrainingResult; 