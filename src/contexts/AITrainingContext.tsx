import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { TrainingParameters, GeneratedTraining, generateTraining } from '@/services/mistralAIService';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import supabase from '../lib/supabase';

// Interface do contexto
interface AITrainingContextType {
  isGenerating: boolean;
  generatedTraining: GeneratedTraining | null;
  generateAITraining: (params: TrainingParameters) => Promise<void>;
  clearGeneratedTraining: () => void;
  saveGeneratedTrainingToMyWorkouts: () => Promise<string | null>;
  error: string | null;
}

// Valor padrão do contexto
const defaultValue: AITrainingContextType = {
  isGenerating: false,
  generatedTraining: null,
  generateAITraining: async () => {},
  clearGeneratedTraining: () => {},
  saveGeneratedTrainingToMyWorkouts: async () => null,
  error: null,
};

// Criação do contexto
const AITrainingContext = createContext<AITrainingContextType>(defaultValue);

// Hook para usar o contexto
export const useAITraining = () => {
  const context = useContext(AITrainingContext);
  if (context === undefined) {
    throw new Error('useAITraining deve ser usado dentro de AITrainingProvider');
  }
  return context;
};

// Provider do contexto
export const AITrainingProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedTraining, setGeneratedTraining] = useState<GeneratedTraining | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Função para gerar treino com IA
  const generateAITraining = useCallback(async (params: TrainingParameters) => {
    if (!user) {
      setError('Usuário não autenticado');
      toast.error('Você precisa estar logado para gerar treinos com IA');
      return;
    }

    try {
      setIsGenerating(true);
      setError(null);
      setGeneratedTraining(null);

      toast.info('Gerando seu treino personalizado...');
      
      // Simulação de loading para melhor experiência do usuário
      const training = await generateTraining(params);
      
      if (training.status === 'failed') {
        setError('Falha ao gerar treino. Tente novamente.');
        toast.error('Ocorreu um erro ao gerar seu treino. Por favor, tente novamente.');
      } else {
        setGeneratedTraining(training);
        toast.success('Treino gerado com sucesso!');
      }
    } catch (err) {
      console.error('Erro ao gerar treino:', err);
      setError('Erro ao gerar treino. Tente novamente.');
      toast.error('Ocorreu um erro ao gerar seu treino. Por favor, tente novamente.');
    } finally {
      setIsGenerating(false);
    }
  }, [user]);

  // Função para limpar o treino gerado
  const clearGeneratedTraining = useCallback(() => {
    setGeneratedTraining(null);
    setError(null);
  }, []);

  // Função para salvar o treino gerado na lista de treinos do usuário
  const saveGeneratedTrainingToMyWorkouts = useCallback(async () => {
    if (!user) {
      setError('Usuário não autenticado');
      toast.error('Você precisa estar logado para salvar treinos');
      return null;
    }

    if (!generatedTraining) {
      setError('Não há treino gerado para salvar');
      toast.error('Não há treino gerado para salvar');
      return null;
    }

    try {
      // Convertendo o treino gerado pela IA para o formato necessário para o Supabase
      // Primeiro, encontrar a maior ordem atual para organização dos treinos
      const { data: existingWorkouts, error: workoutsError } = await supabase
        .from('treino_4aivzd_workouts')
        .select('order')
        .eq('user_id', user.id)
        .order('order', { ascending: false })
        .limit(1);
      
      if (workoutsError) throw new Error(workoutsError.message);
      
      // Determinar a próxima ordem
      let nextOrder = 0;
      if (existingWorkouts && existingWorkouts.length > 0 && existingWorkouts[0].order !== null) {
        nextOrder = existingWorkouts[0].order + 1;
      }
      
      // Inserir o treino no banco de dados
      const { data: workout, error: insertError } = await supabase
        .from('treino_4aivzd_workouts')
        .insert({
          user_id: user.id,
          title: generatedTraining.title,
          description: generatedTraining.description,
          type: 'hypertrophy', // Valor padrão, pode ser ajustado conforme necessário
          difficulty: 'intermediate', // Valor padrão, pode ser ajustado conforme necessário
          status: 'draft', // Começa como rascunho para permitir edições
          estimated_duration_min: 45, // Valor padrão estimado
          is_ai_generated: true, // Marcado como gerado por IA
          is_public: false,
          rest_between_exercises_sec: 60, // Valor padrão
          order: nextOrder,
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        })
        .select()
        .single();
      
      if (insertError) throw new Error(insertError.message);
      
      // Agora, inserir os exercícios do treino
      if (generatedTraining.exercises && generatedTraining.exercises.length > 0) {
        // Obter ou criar os exercícios no banco de dados
        for (let i = 0; i < generatedTraining.exercises.length; i++) {
          const exercise = generatedTraining.exercises[i];
          
          // Primeiro verificar se o exercício já existe pelo nome
          const { data: exerciseData, error: exerciseError } = await supabase
            .from('treino_4aivzd_exercises')
            .select('id')
            .ilike('name', exercise.name)
            .maybeSingle();
          
          if (exerciseError) throw new Error(exerciseError.message);
          
          let exerciseId;
          
          // Se o exercício não existe, criar um novo
          if (!exerciseData) {
            const { data: newExercise, error: createExerciseError } = await supabase
              .from('treino_4aivzd_exercises')
              .insert({
                name: exercise.name,
                description: exercise.instructions || '',
                // Valores padrão para os campos obrigatórios
                muscle_groups: ['general'],
                category: 'compound',
                difficulty: 'intermediate',
                created_by: user.id,
                is_verified: false,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString()
              })
              .select()
              .single();
            
            if (createExerciseError) throw new Error(createExerciseError.message);
            exerciseId = newExercise.id;
          } else {
            exerciseId = exerciseData.id;
          }
          
          // Inserir a relação entre treino e exercício
          const { error: workoutExerciseError } = await supabase
            .from('treino_4aivzd_workout_exercises')
            .insert({
              workout_id: workout.id,
              exercise_id: exerciseId,
              order_position: i + 1,
              sets: exercise.sets,
              reps_per_set: exercise.reps,
              rest_after_sec: exercise.rest,
              tracking_type: 'weight',
              notes: exercise.instructions
            });
          
          if (workoutExerciseError) throw new Error(workoutExerciseError.message);
        }
      }
      
      toast.success('Treino salvo com sucesso!');
      
      // Retornar o ID do treino salvo para redirecionamento
      return workout.id;
    } catch (err) {
      console.error('Erro ao salvar treino:', err);
      setError('Erro ao salvar treino. Tente novamente.');
      toast.error('Ocorreu um erro ao salvar seu treino. Por favor, tente novamente.');
      return null;
    }
  }, [user, generatedTraining]);

  // Valores do contexto
  const contextValue = useMemo(() => ({
    isGenerating,
    generatedTraining,
    generateAITraining,
    clearGeneratedTraining,
    saveGeneratedTrainingToMyWorkouts,
    error,
  }), [
    isGenerating,
    generatedTraining,
    generateAITraining,
    clearGeneratedTraining,
    saveGeneratedTrainingToMyWorkouts,
    error,
  ]);

  return (
    <AITrainingContext.Provider value={contextValue}>
      {children}
    </AITrainingContext.Provider>
  );
}; 