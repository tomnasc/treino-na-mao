import supabase from '../supabase';
import { Workout, WorkoutExercise, Exercise } from '../../types';

export interface WorkoutCreationData {
  title: string;
  description?: string;
  type: string;
  difficulty: string;
  estimated_duration_min?: number;
  rest_between_exercises_sec?: number;
  is_public?: boolean;
  exercises: {
    exercise_id: string;
    order_position: number;
    sets: number;
    reps_per_set?: number;
    reps_type?: string;
    weight_kg?: number;
    rest_after_sec?: number;
    notes?: string;
  }[];
}

export interface WorkoutUpdateData extends Partial<WorkoutCreationData> {}

export interface WorkoutFilters {
  type?: string;
  difficulty?: string;
  status?: string;
  is_ai_generated?: boolean;
  is_public?: boolean;
}

export interface WorkoutResponse {
  workout: Workout | null;
  error: string | null;
}

export interface WorkoutsListResponse {
  workouts: Workout[];
  error: string | null;
}

export interface WorkoutDetailResponse {
  workout: Workout | null;
  exercises: (WorkoutExercise & { exercise: Exercise })[] | null;
  error: string | null;
}

export interface StatusResponse {
  success: boolean;
  error: string | null;
}

export const WorkoutService = {
  /**
   * Criar um novo treino
   */
  async createWorkout(userId: string, workoutData: WorkoutCreationData): Promise<WorkoutResponse> {
    try {
      // Inserir o treino
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .insert({
          user_id: userId,
          title: workoutData.title,
          description: workoutData.description || null,
          type: workoutData.type,
          difficulty: workoutData.difficulty,
          status: 'draft',
          estimated_duration_min: workoutData.estimated_duration_min || null,
          is_ai_generated: false,
          is_public: workoutData.is_public || false,
          rest_between_exercises_sec: workoutData.rest_between_exercises_sec || 60
        })
        .select()
        .single();

      if (workoutError) throw new Error(workoutError.message);

      // Inserir os exercícios relacionados
      if (workoutData.exercises && workoutData.exercises.length > 0) {
        const exercisesToInsert = workoutData.exercises.map(exercise => ({
          workout_id: workout.id,
          exercise_id: exercise.exercise_id,
          order_position: exercise.order_position,
          sets: exercise.sets,
          reps_per_set: exercise.reps_per_set || null,
          reps_type: exercise.reps_type || 'count',
          weight_kg: exercise.weight_kg || null,
          rest_after_sec: exercise.rest_after_sec || 90,
          notes: exercise.notes || null
        }));

        const { error: exercisesError } = await supabase
          .from('workout_exercises')
          .insert(exercisesToInsert);

        if (exercisesError) throw new Error(exercisesError.message);
      }

      return { workout, error: null };
    } catch (error) {
      console.error('Error creating workout:', error);
      return { workout: null, error: error instanceof Error ? error.message : 'Erro desconhecido ao criar treino' };
    }
  },

  /**
   * Obter lista de treinos do usuário
   */
  async getWorkouts(userId: string, filters: WorkoutFilters = {}): Promise<WorkoutsListResponse> {
    try {
      let query = supabase
        .from('workouts')
        .select('*')
        .eq('user_id', userId);

      // Aplicar filtros
      if (filters.type) query = query.eq('type', filters.type);
      if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.is_ai_generated !== undefined) query = query.eq('is_ai_generated', filters.is_ai_generated);
      if (filters.is_public !== undefined) query = query.eq('is_public', filters.is_public);

      // Ordenar por data de criação (mais recentes primeiro)
      query = query.order('created_at', { ascending: false });

      const { data: workouts, error } = await query;

      if (error) throw new Error(error.message);

      return { workouts: workouts || [], error: null };
    } catch (error) {
      console.error('Error fetching workouts:', error);
      return { workouts: [], error: error instanceof Error ? error.message : 'Erro desconhecido ao obter treinos' };
    }
  },

  /**
   * Obter detalhes de um treino específico
   */
  async getWorkoutById(workoutId: string): Promise<WorkoutDetailResponse> {
    try {
      // Obter o treino
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .select('*')
        .eq('id', workoutId)
        .single();

      if (workoutError) throw new Error(workoutError.message);

      // Obter os exercícios do treino com join para os detalhes do exercício
      const { data: exercises, error: exercisesError } = await supabase
        .from('workout_exercises')
        .select(`
          *,
          exercise:exercises(*)
        `)
        .eq('workout_id', workoutId)
        .order('order_position', { ascending: true });

      if (exercisesError) throw new Error(exercisesError.message);

      return { workout, exercises, error: null };
    } catch (error) {
      console.error('Error fetching workout details:', error);
      return { 
        workout: null, 
        exercises: null, 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao obter detalhes do treino' 
      };
    }
  },

  /**
   * Atualizar um treino existente
   */
  async updateWorkout(workoutId: string, workoutData: WorkoutUpdateData): Promise<WorkoutResponse> {
    try {
      // Atualizar o treino
      const { data: workout, error: workoutError } = await supabase
        .from('workouts')
        .update({
          title: workoutData.title,
          description: workoutData.description,
          type: workoutData.type,
          difficulty: workoutData.difficulty,
          estimated_duration_min: workoutData.estimated_duration_min,
          is_public: workoutData.is_public,
          rest_between_exercises_sec: workoutData.rest_between_exercises_sec
        })
        .eq('id', workoutId)
        .select()
        .single();

      if (workoutError) throw new Error(workoutError.message);

      // Se houver exercícios para atualizar
      if (workoutData.exercises) {
        // Primeiro removemos todos os exercícios existentes
        const { error: deleteError } = await supabase
          .from('workout_exercises')
          .delete()
          .eq('workout_id', workoutId);

        if (deleteError) throw new Error(deleteError.message);

        // Depois inserimos os novos exercícios
        const exercisesToInsert = workoutData.exercises.map(exercise => ({
          workout_id: workoutId,
          exercise_id: exercise.exercise_id,
          order_position: exercise.order_position,
          sets: exercise.sets,
          reps_per_set: exercise.reps_per_set || null,
          reps_type: exercise.reps_type || 'count',
          weight_kg: exercise.weight_kg || null,
          rest_after_sec: exercise.rest_after_sec || 90,
          notes: exercise.notes || null
        }));

        const { error: insertError } = await supabase
          .from('workout_exercises')
          .insert(exercisesToInsert);

        if (insertError) throw new Error(insertError.message);
      }

      return { workout, error: null };
    } catch (error) {
      console.error('Error updating workout:', error);
      return { workout: null, error: error instanceof Error ? error.message : 'Erro desconhecido ao atualizar treino' };
    }
  },

  /**
   * Deletar um treino
   */
  async deleteWorkout(workoutId: string): Promise<StatusResponse> {
    try {
      // Deletar os exercícios relacionados
      await supabase
        .from('workout_exercises')
        .delete()
        .eq('workout_id', workoutId);

      // Deletar o treino
      const { error } = await supabase
        .from('workouts')
        .delete()
        .eq('id', workoutId);

      if (error) throw new Error(error.message);

      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting workout:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao deletar treino' };
    }
  },

  /**
   * Clonar um treino existente
   */
  async cloneWorkout(workoutId: string, userId: string): Promise<WorkoutResponse> {
    try {
      // Obter o treino original
      const { workout, exercises, error: fetchError } = await this.getWorkoutById(workoutId);
      if (fetchError) throw new Error(fetchError);
      if (!workout || !exercises) throw new Error('Treino não encontrado');

      // Criar um novo treino com base no original
      const { data: newWorkout, error: createError } = await supabase
        .from('workouts')
        .insert({
          user_id: userId,
          title: `Cópia de ${workout.title}`,
          description: workout.description,
          type: workout.type,
          difficulty: workout.difficulty,
          status: 'draft',
          estimated_duration_min: workout.estimated_duration_min,
          is_ai_generated: workout.is_ai_generated,
          is_public: false, // Cópias são privadas por padrão
          rest_between_exercises_sec: workout.rest_between_exercises_sec
        })
        .select()
        .single();

      if (createError) throw new Error(createError.message);

      // Inserir os exercícios relacionados
      const exercisesToInsert = exercises.map(item => ({
        workout_id: newWorkout.id,
        exercise_id: item.exercise_id,
        order_position: item.order_position,
        sets: item.sets,
        reps_per_set: item.reps_per_set,
        reps_type: item.reps_type,
        weight_kg: item.weight_kg,
        rest_after_sec: item.rest_after_sec,
        notes: item.notes
      }));

      const { error: insertError } = await supabase
        .from('workout_exercises')
        .insert(exercisesToInsert);

      if (insertError) throw new Error(insertError.message);

      return { workout: newWorkout, error: null };
    } catch (error) {
      console.error('Error cloning workout:', error);
      return { workout: null, error: error instanceof Error ? error.message : 'Erro desconhecido ao clonar treino' };
    }
  }
};

export default WorkoutService; 