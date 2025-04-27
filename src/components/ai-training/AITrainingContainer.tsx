import React from 'react';
import { useAITraining } from '../../contexts/AITrainingContext';
import AITrainingForm from './AITrainingForm';
import AITrainingResult from './AITrainingResult';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { AlertCircle } from 'lucide-react';

const AITrainingContainer: React.FC = () => {
  const { error, isGenerating, generatedTraining } = useAITraining();

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">Geração de Treino com IA</h1>
        <p className="text-muted-foreground">
          Crie um treino personalizado utilizando inteligência artificial. Basta informar seus objetivos e preferências.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Erro</AlertTitle>
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Exibe o formulário se não houver treino gerado ou se estiver em processo de geração */}
      {(!generatedTraining || isGenerating) && <AITrainingForm />}
      
      {/* Exibe o resultado quando um treino é gerado */}
      <AITrainingResult />
    </div>
  );
};

export default AITrainingContainer; 