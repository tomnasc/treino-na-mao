import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/supabase';
import { Workout, Exercise, WorkoutExercise, WorkoutStatus, ExerciseTrackingType } from '../types';
import PageLayout from '../components/layout/PageLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { ArrowLeft, Save } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "../components/ui/dialog";
import WorkoutExerciseList from '../components/WorkoutExerciseList';
import ExerciseSelector from '../components/ExerciseSelector';
import WorkoutExerciseForm, { WorkoutExerciseFormValues } from '../components/WorkoutExerciseForm';

const WorkoutEditPage: React.FC = () => {
  const { workoutId } = useParams<{ workoutId: string }>();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [workoutExercises, setWorkoutExercises] = useState<(WorkoutExercise & { exercise: Exercise })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [openExerciseDialog, setOpenExerciseDialog] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [workoutTitle, setWorkoutTitle] = useState('');

  // Carregar o treino e seus exercícios
  useEffect(() => {
    const loadWorkoutDetails = async () => {
      if (!user || !workoutId) return;
      
      setIsLoading(true);
      try {
        // Carregar informações do treino
        const { data: workoutData, error: workoutError } = await supabase
          .from('treino_4aivzd_workouts')
          .select('*')
          .eq('id', workoutId)
          .maybeSingle();

        if (workoutError) throw new Error(workoutError.message);
        
        if (!workoutData) {
          toast.error('Treino não encontrado');
          navigate('/workouts');
          return;
        }
        
        // Verificar se o treino pertence ao usuário
        if (workoutData.user_id !== user.id) {
          toast.error('Você não tem permissão para editar este treino');
          navigate('/workouts');
          return;
        }

        setWorkout(workoutData);
        setWorkoutTitle(workoutData.title);

        // Carregar exercícios do treino
        const { data: exercisesData, error: exercisesError } = await supabase
          .from('treino_4aivzd_workout_exercises')
          .select(`
            *,
            exercise:exercise_id (*)
          `)
          .eq('workout_id', workoutId)
          .order('order_position', { ascending: true });

        if (exercisesError) throw new Error(exercisesError.message);

        setWorkoutExercises(exercisesData || []);
      } catch (error) {
        console.error('Erro ao carregar detalhes do treino:', error);
        toast.error('Erro ao carregar o treino');
        navigate('/workouts');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkoutDetails();
  }, [user, workoutId, navigate]);

  // Adicionar exercícios ao treino
  const handleAddExercises = async (exercises: Exercise[]) => {
    if (!user || !workoutId || exercises.length === 0) return;
    
    setIsSaving(true);
    try {
      // Obter a posição atual mais alta
      let maxPosition = 0;
      if (workoutExercises.length > 0) {
        maxPosition = Math.max(...workoutExercises.map(ex => ex.order_position));
      }

      // Preparar dados para inserção, evitando exercícios já existentes
      const existingExerciseIds = workoutExercises.map(ex => ex.exercise_id);
      const newExercises = exercises
        .filter(ex => !existingExerciseIds.includes(ex.id))
        .map((exercise, index) => ({
          workout_id: workoutId,
          exercise_id: exercise.id,
          order_position: maxPosition + index + 1,
          tracking_type: ExerciseTrackingType.Weight, // Tipo padrão para novos exercícios
          sets: 3,
          reps_per_set: 12,
          duration_sec: 30, // Duração padrão para exercícios baseados em tempo
          rest_after_sec: 60,
        }));

      if (newExercises.length === 0) {
        toast.info('Todos os exercícios selecionados já estão no treino');
        return;
      }

      // Inserir novos exercícios
      const { data, error } = await supabase
        .from('treino_4aivzd_workout_exercises')
        .insert(newExercises)
        .select(`
          *,
          exercise:exercise_id (*)
        `);

      if (error) throw new Error(error.message);

      toast.success(`${newExercises.length} exercícios adicionados ao treino`);
      
      // Atualizar estado local
      setWorkoutExercises(prev => [...prev, ...(data || [])]);
    } catch (error) {
      console.error('Erro ao adicionar exercícios:', error);
      toast.error('Erro ao adicionar exercícios ao treino');
    } finally {
      setIsSaving(false);
    }
  };

  // Reordenar exercícios
  const handleReorderExercise = async (
    exerciseId: string, 
    currentPosition: number, 
    newPosition: number
  ) => {
    if (!user || !workoutId) return;
    
    // Validação básica
    if (currentPosition === newPosition || 
        newPosition < 1 || 
        newPosition > workoutExercises.length) {
      return;
    }
    
    try {
      // Achar o exercício a ser movido
      const targetExercise = workoutExercises.find(
        ex => ex.exercise_id === exerciseId && ex.order_position === currentPosition
      );
      
      if (!targetExercise) {
        toast.error('Exercício não encontrado');
        return;
      }
      
      // Clonar a lista atual para manipulação local
      const updatedExercises = [...workoutExercises];
      
      // Remover da posição atual
      const exerciseIndex = updatedExercises.findIndex(
        ex => ex.exercise_id === exerciseId && ex.order_position === currentPosition
      );
      
      // O que está acontecendo aqui é a reordenação dos exercícios no array
      if (exerciseIndex !== -1) {
        const [removed] = updatedExercises.splice(exerciseIndex, 1);
        
        // Se estamos movendo para cima: diminuir a posição dos exercícios entre a nova posição e a atual
        if (newPosition < currentPosition) {
          for (let i = 0; i < updatedExercises.length; i++) {
            if (updatedExercises[i].order_position >= newPosition && 
                updatedExercises[i].order_position < currentPosition) {
              updatedExercises[i].order_position += 1;
            }
          }
        } 
        // Se estamos movendo para baixo: aumentar a posição dos exercícios entre a atual e a nova posição
        else {
          for (let i = 0; i < updatedExercises.length; i++) {
            if (updatedExercises[i].order_position <= newPosition && 
                updatedExercises[i].order_position > currentPosition) {
              updatedExercises[i].order_position -= 1;
            }
          }
        }
        
        // Definir a nova posição para o exercício movido
        removed.order_position = newPosition;
        
        // Inserir na nova posição
        const insertIndex = updatedExercises.findIndex(ex => ex.order_position >= newPosition);
        if (insertIndex === -1) {
          updatedExercises.push(removed);
        } else {
          updatedExercises.splice(insertIndex, 0, removed);
        }
      }
      
      // Atualizar o estado local imediatamente para feedback visual rápido
      setWorkoutExercises(updatedExercises);
      
      // Preparar updates para o banco de dados
      const updates = updatedExercises.map(ex => ({
        workout_id: workoutId,
        exercise_id: ex.exercise_id,
        old_position: ex.order_position !== ex.order_position ? ex.order_position : null,
        order_position: ex.order_position
      }));
      
      // Atualizar no banco de dados - Reordenar todos os exercícios para garantir consistência
      // Como não há API direta no Supabase para reordenação em massa, usamos transações ou RPC
      // Aqui, vamos fazer atualizações individuais para simplificar
      for (const update of updates) {
        if (update.old_position === null) continue; // Pular se não mudou
        
        await supabase
          .from('treino_4aivzd_workout_exercises')
          .update({ order_position: update.order_position })
          .eq('workout_id', update.workout_id)
          .eq('exercise_id', update.exercise_id);
      }
      
    } catch (error) {
      console.error('Erro ao reordenar exercícios:', error);
      toast.error('Erro ao reordenar exercícios');
      
      // Recarregar os exercícios para garantir consistência em caso de erro
      const { data, error: reloadError } = await supabase
        .from('treino_4aivzd_workout_exercises')
        .select(`*, exercise:exercise_id (*)`)
        .eq('workout_id', workoutId)
        .order('order_position');
        
      if (!reloadError && data) {
        setWorkoutExercises(data);
      }
    }
  };

  // Remover exercício do treino
  const handleRemoveExercise = async (exerciseId: string, orderPosition: number) => {
    if (!user || !workoutId) return;
    
    try {
      // Remover do banco de dados
      const { error } = await supabase
        .from('treino_4aivzd_workout_exercises')
        .delete()
        .eq('workout_id', workoutId)
        .eq('exercise_id', exerciseId)
        .eq('order_position', orderPosition);

      if (error) throw new Error(error.message);
      
      toast.success('Exercício removido do treino');
      
      // Atualizar estado local
      setWorkoutExercises(prev => 
        prev.filter(ex => 
          !(ex.exercise_id === exerciseId && ex.order_position === orderPosition)
        )
      );
      
      // Atualizar posições dos exercícios restantes
      const updatedExercises = [...workoutExercises]
        .filter(ex => !(ex.exercise_id === exerciseId && ex.order_position === orderPosition))
        .map((ex, idx) => ({
          ...ex,
          order_position: idx + 1
        }));
      
      setWorkoutExercises(updatedExercises);
      
      // Atualizar posições no banco de dados
      for (const ex of updatedExercises) {
        await supabase
          .from('treino_4aivzd_workout_exercises')
          .update({ order_position: ex.order_position })
          .eq('workout_id', workoutId)
          .eq('exercise_id', ex.exercise_id);
      }
      
    } catch (error) {
      console.error('Erro ao remover exercício:', error);
      toast.error('Erro ao remover exercício do treino');
    }
  };

  // Abrir dialog para editar exercício
  const handleEditExercise = (exercise: WorkoutExercise) => {
    const fullExercise = workoutExercises.find(
      ex => ex.exercise_id === exercise.exercise_id && ex.order_position === exercise.order_position
    );
    
    if (fullExercise) {
      setCurrentExercise(fullExercise.exercise);
      setOpenExerciseDialog(true);
    }
  };

  // Salvar detalhes de um exercício
  const handleSaveExerciseDetails = async (
    exerciseId: string, 
    values: WorkoutExerciseFormValues
  ) => {
    if (!user || !workoutId) return;
    
    setIsSaving(true);
    try {
      // Encontrar o exercício a ser atualizado
      const exerciseToUpdate = workoutExercises.find(ex => ex.exercise_id === exerciseId);
      
      if (!exerciseToUpdate) {
        toast.error('Exercício não encontrado no treino');
        return;
      }
      
      // Atualizar no banco de dados com todos os campos
      const { error } = await supabase
        .from('treino_4aivzd_workout_exercises')
        .update({
          tracking_type: values.tracking_type,
          sets: values.sets,
          reps_per_set: values.reps_per_set,
          duration_sec: values.duration_sec,
          rest_after_sec: values.rest_after_sec,
          notes: values.notes
        })
        .eq('workout_id', workoutId)
        .eq('exercise_id', exerciseId)
        .eq('order_position', exerciseToUpdate.order_position);
      
      if (error) throw new Error(error.message);
      
      toast.success('Detalhes do exercício atualizados');
      
      // Atualizar estado local
      setWorkoutExercises(prev => 
        prev.map(ex => {
          if (ex.exercise_id === exerciseId && ex.order_position === exerciseToUpdate.order_position) {
            return {
              ...ex,
              tracking_type: values.tracking_type,
              sets: values.sets,
              reps_per_set: values.reps_per_set,
              duration_sec: values.duration_sec,
              rest_after_sec: values.rest_after_sec,
              notes: values.notes
            };
          }
          return ex;
        })
      );
      
      // Fechar o dialog
      setOpenExerciseDialog(false);
      setCurrentExercise(null);
    } catch (error) {
      console.error('Erro ao atualizar detalhes do exercício:', error);
      toast.error('Erro ao atualizar detalhes do exercício');
    } finally {
      setIsSaving(false);
    }
  };

  // Salvar título do treino
  const handleSaveWorkoutTitle = async () => {
    if (!user || !workoutId || !workoutTitle.trim()) return;
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('treino_4aivzd_workouts')
        .update({ title: workoutTitle.trim() })
        .eq('id', workoutId)
        .eq('user_id', user.id);
      
      if (error) throw new Error(error.message);
      
      toast.success('Título do treino atualizado');
      
      // Atualizar estado local
      if (workout) {
        setWorkout({
          ...workout,
          title: workoutTitle.trim()
        });
      }
    } catch (error) {
      console.error('Erro ao atualizar título do treino:', error);
      toast.error('Erro ao atualizar título do treino');
    } finally {
      setIsSaving(false);
    }
  };

  // Publicar treino (mudar status para active)
  const handlePublishWorkout = async () => {
    if (!user || !workoutId) return;
    
    // Verificar se tem pelo menos um exercício
    if (workoutExercises.length === 0) {
      toast.error('Adicione pelo menos um exercício antes de publicar o treino');
      return;
    }
    
    setIsSaving(true);
    try {
      const { error } = await supabase
        .from('treino_4aivzd_workouts')
        .update({ status: WorkoutStatus.Active })
        .eq('id', workoutId)
        .eq('user_id', user.id);
      
      if (error) throw new Error(error.message);
      
      toast.success('Treino publicado com sucesso!');
      
      // Atualizar estado local
      if (workout) {
        setWorkout({
          ...workout,
          status: WorkoutStatus.Active
        });
      }

      // Redirecionar para a página de treinos
      navigate('/workouts');
    } catch (error) {
      console.error('Erro ao publicar treino:', error);
      toast.error('Erro ao publicar treino');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <PageLayout>
      <div className="container py-6">
        <div className="flex items-center gap-4 mb-6">
          <Button variant="ghost" onClick={() => navigate('/workouts')}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Voltar
          </Button>
          <h1 className="text-2xl font-bold flex-1">
            {isLoading ? 'Carregando...' : (workout ? 'Editar Treino' : 'Novo Treino')}
          </h1>
          <Button onClick={handleSaveWorkoutTitle} disabled={isLoading || isSaving}>
            <Save className="h-4 w-4 mr-2" />
            Salvar
          </Button>
          <Button onClick={handlePublishWorkout} disabled={isLoading || isSaving}>
            Publicar
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-12">
            <span>Carregando detalhes do treino...</span>
          </div>
        ) : (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Detalhes do Treino</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div>
                    <label htmlFor="workout-title" className="block text-sm font-medium mb-1">
                      Título do Treino
                    </label>
                    <Input
                      id="workout-title"
                      value={workoutTitle}
                      onChange={(e) => setWorkoutTitle(e.target.value)}
                      placeholder="Digite o título do treino"
                      className="max-w-md"
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="mb-6">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Exercícios</CardTitle>
                <ExerciseSelector
                  onSelect={handleAddExercises}
                  buttonText="Adicionar Exercício"
                />
              </CardHeader>
              <CardContent>
                <WorkoutExerciseList
                  exercises={workoutExercises}
                  onRemove={handleRemoveExercise}
                  onReorder={handleReorderExercise}
                  onEditExercise={handleEditExercise}
                />
              </CardContent>
            </Card>
          </>
        )}

        {/* Dialog para editar detalhes de um exercício */}
        <Dialog open={openExerciseDialog} onOpenChange={setOpenExerciseDialog}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Editar Exercício</DialogTitle>
              <DialogDescription id="dialog-description">
                Configure os detalhes do exercício no treino
              </DialogDescription>
            </DialogHeader>
            {currentExercise && (
              <WorkoutExerciseForm
                exercise={currentExercise}
                defaultValues={
                  workoutExercises.find(ex => ex.exercise_id === currentExercise.id) || undefined
                }
                onSubmit={handleSaveExerciseDetails}
                onCancel={() => setOpenExerciseDialog(false)}
                isSubmitting={isSaving}
              />
            )}
          </DialogContent>
        </Dialog>
      </div>
    </PageLayout>
  );
};

export default WorkoutEditPage; 