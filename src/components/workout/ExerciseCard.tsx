import React, { useState, useEffect } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { CheckCircle, SkipForward, Youtube, Clock, AlertTriangle, ChevronUp } from 'lucide-react';
import { Exercise, WorkoutExercise, ExerciseTrackingType } from '../../types';
import { ExerciseTimer } from './ExerciseTimer';
import { VideoModal } from './VideoModal';
import { toast } from 'sonner';

interface ExerciseCardProps {
  exercise: WorkoutExercise & { exercise: Exercise };
  currentSetIndex: number;
  currentReps: number | '';
  currentWeight: number | '';
  isResting: boolean;
  isExercising: boolean;
  timeRemaining: number;
  onRepsChange: (value: number | '') => void;
  onWeightChange: (value: number | '') => void;
  onCompleteSet: () => void;
  onSkipSet: () => void;
  onStartExercise: () => void;
  onExerciseTimerComplete: () => void;
}

export const ExerciseCard: React.FC<ExerciseCardProps> = ({
  exercise,
  currentSetIndex,
  currentReps,
  currentWeight,
  isResting,
  isExercising,
  timeRemaining,
  onRepsChange,
  onWeightChange,
  onCompleteSet,
  onSkipSet,
  onStartExercise,
  onExerciseTimerComplete
}) => {
  const isTimeBasedExercise = exercise.tracking_type === ExerciseTrackingType.Time;
  const [completedSets, setCompletedSets] = useState<number[]>([]);
  const [videoModalOpen, setVideoModalOpen] = useState(false);
  
  // Verificar se o botão de completar série deve ser habilitado
  const isCompleteButtonDisabled = () => {
    // Para exercícios baseados em tempo, a verificação é feita de outra forma
    if (isTimeBasedExercise) {
      return (isResting && timeRemaining > 0) || (!isExercising);
    }
    
    // Para exercícios baseados em repetições, precisa ter digitado o número de repetições
    return (isResting && timeRemaining > 0) || currentReps === '';
  };
  
  // Efeito para verificar e mostrar mensagens com base no número de repetições
  useEffect(() => {
    if (currentReps !== '' && !isTimeBasedExercise) {
      // Verificar se o número de repetições é menor que 6
      if (Number(currentReps) < 6) {
        toast.warning('Número de repetições baixo. Considere reduzir a carga no próximo treino.', {
          icon: <AlertTriangle className="h-4 w-4" />
        });
      }
    }
  }, [currentReps, isTimeBasedExercise]);
  
  // Efeito para rastrear repetições completadas em cada série
  useEffect(() => {
    // Verificar se todas as séries foram completadas com sucesso
    if (currentSetIndex === 0 && completedSets.length === exercise.sets) {
      // Verificar se todas as séries atingiram ou ultrapassaram o alvo de repetições
      const allSetsReachedTarget = completedSets.every(reps => 
        reps >= (exercise.reps_per_set || 0)
      );
      
      if (allSetsReachedTarget) {
        toast.success('Você completou todas as séries com o número alvo de repetições. Considere aumentar a carga no próximo treino.', {
          icon: <ChevronUp className="h-4 w-4" />
        });
      }
      
      // Resetar o controle para o próximo exercício
      setCompletedSets([]);
    }
  }, [currentSetIndex, completedSets, exercise.sets, exercise.reps_per_set]);
  
  // Função para lidar com completar série e registrar as repetições
  const handleCompleteSet = () => {
    // Registrar as repetições desta série
    if (!isTimeBasedExercise && currentReps !== '') {
      const newCompletedSets = [...completedSets, Number(currentReps)];
      setCompletedSets(newCompletedSets);
    }
    
    // Chamar a função original de completar série
    onCompleteSet();
  };

  return (
    <Card className="mb-6">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle>{exercise.exercise.name}</CardTitle>
            <CardDescription>
              {exercise.exercise.muscle_groups.join(', ')}
            </CardDescription>
          </div>
          {exercise.exercise.youtube_video_id && (
            <Button 
              size="sm" 
              variant="outline" 
              className="flex items-center"
              onClick={() => setVideoModalOpen(true)}
            >
              <Youtube className="h-4 w-4 mr-2" />
              Ver Vídeo
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h3 className="text-lg font-medium mb-2">Detalhes</h3>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Séries:</span>
                <span className="font-medium">{exercise.sets}</span>
              </div>
              {isTimeBasedExercise ? (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Duração:</span>
                  <span className="font-medium">
                    {exercise.duration_sec ? `${exercise.duration_sec} segundos` : 'Não especificado'}
                  </span>
                </div>
              ) : (
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Repetições:</span>
                  <span className="font-medium">{exercise.reps_per_set || 'Não especificado'}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-muted-foreground">Descanso:</span>
                <span className="font-medium">{exercise.rest_after_sec ? `${exercise.rest_after_sec} segundos` : 'Não especificado'}</span>
              </div>
              {exercise.notes && (
                <div className="mt-4">
                  <p className="text-sm text-muted-foreground">{exercise.notes}</p>
                </div>
              )}
            </div>
          </div>
          
          <div>
            <h3 className="text-lg font-medium mb-2">Série Atual</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <span className="text-muted-foreground">Série:</span>
                <Badge variant="outline">{currentSetIndex + 1} de {exercise.sets}</Badge>
              </div>
              
              {isTimeBasedExercise ? (
                <div className="flex items-center gap-2">
                  {!isExercising && (
                    <Button 
                      onClick={onStartExercise} 
                      className="w-full"
                      disabled={isResting && timeRemaining > 0}
                    >
                      <Clock className="mr-2 h-4 w-4" />
                      Iniciar Exercício
                    </Button>
                  )}
                </div>
              ) : (
                <>
                  <div className="space-y-2">
                    <Label htmlFor="reps">Repetições</Label>
                    <Input
                      id="reps"
                      type="number"
                      placeholder={exercise.reps_per_set?.toString() || "Repetições"}
                      value={currentReps}
                      onChange={(e) => onRepsChange(e.target.value ? parseInt(e.target.value) : '')}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label htmlFor="weight">Peso (kg)</Label>
                    <Input
                      id="weight"
                      type="number"
                      placeholder="Peso utilizado (opcional)"
                      value={currentWeight}
                      onChange={(e) => onWeightChange(e.target.value ? parseInt(e.target.value) : '')}
                    />
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
        
        {isExercising && isTimeBasedExercise && exercise.duration_sec && (
          <div className="mt-4">
            <ExerciseTimer 
              duration={exercise.duration_sec} 
              onComplete={onExerciseTimerComplete} 
            />
          </div>
        )}
      </CardContent>
      <CardFooter className="flex flex-col sm:flex-row gap-3">
        {!isExercising && (
          <>
            <Button 
              className="w-full sm:w-auto"
              onClick={handleCompleteSet}
              disabled={isCompleteButtonDisabled()}
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Completar Série
            </Button>
            <Button 
              variant="outline" 
              className="w-full sm:w-auto"
              onClick={onSkipSet}
              disabled={isResting && timeRemaining > 0}
            >
              <SkipForward className="mr-2 h-4 w-4" />
              Pular Série
            </Button>
          </>
        )}
      </CardFooter>
      
      {/* Modal de vídeo */}
      {exercise.exercise.youtube_video_id && (
        <VideoModal
          open={videoModalOpen}
          onOpenChange={setVideoModalOpen}
          videoId={exercise.exercise.youtube_video_id}
          title={`${exercise.exercise.name} - Vídeo demonstrativo`}
        />
      )}
    </Card>
  );
}; 