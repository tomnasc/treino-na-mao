import supabase from '../supabase';
import { Exercise } from '../../types';

export interface ExerciseCreationData {
  name: string;
  description?: string;
  muscle_groups: string[];
  equipment?: string[];
  category: string;
  difficulty: string;
  youtube_video_id?: string;
  thumbnail_url?: string;
}

export interface ExerciseUpdateData extends Partial<ExerciseCreationData> {}

export interface ExerciseFilters {
  category?: string;
  difficulty?: string;
  muscle_groups?: string[];
  equipment?: string[];
  is_verified?: boolean;
}

export interface ExerciseResponse {
  exercise: Exercise | null;
  error: string | null;
}

export interface ExerciseListResponse {
  exercises: Exercise[];
  error: string | null;
}

export interface StatusResponse {
  success: boolean;
  error: string | null;
}

export const ExerciseService = {
  /**
   * Obter lista de exercícios com filtros opcionais
   */
  async getExercises(filters: ExerciseFilters = {}): Promise<ExerciseListResponse> {
    try {
      let query = supabase
        .from('exercises')
        .select('*');

      // Aplicar filtros
      if (filters.category) query = query.eq('category', filters.category);
      if (filters.difficulty) query = query.eq('difficulty', filters.difficulty);
      if (filters.is_verified !== undefined) query = query.eq('is_verified', filters.is_verified);
      
      // Filtros para arrays (usando operador de sobreposição)
      if (filters.muscle_groups && filters.muscle_groups.length > 0) {
        query = query.overlaps('muscle_groups', filters.muscle_groups);
      }
      
      if (filters.equipment && filters.equipment.length > 0) {
        query = query.overlaps('equipment', filters.equipment);
      }

      // Ordenar por nome
      query = query.order('name', { ascending: true });

      const { data: exercises, error } = await query;

      if (error) throw new Error(error.message);

      return { exercises: exercises || [], error: null };
    } catch (error) {
      console.error('Error fetching exercises:', error);
      return { exercises: [], error: error instanceof Error ? error.message : 'Erro desconhecido ao obter exercícios' };
    }
  },

  /**
   * Obter um exercício por ID
   */
  async getExerciseById(exerciseId: string): Promise<ExerciseResponse> {
    try {
      const { data: exercise, error } = await supabase
        .from('exercises')
        .select('*')
        .eq('id', exerciseId)
        .single();

      if (error) throw new Error(error.message);

      return { exercise, error: null };
    } catch (error) {
      console.error('Error fetching exercise:', error);
      return { exercise: null, error: error instanceof Error ? error.message : 'Erro desconhecido ao obter exercício' };
    }
  },

  /**
   * Criar um novo exercício
   */
  async createExercise(userId: string, exerciseData: ExerciseCreationData): Promise<ExerciseResponse> {
    try {
      const { data: exercise, error } = await supabase
        .from('exercises')
        .insert({
          name: exerciseData.name,
          description: exerciseData.description || null,
          muscle_groups: exerciseData.muscle_groups,
          equipment: exerciseData.equipment || [],
          category: exerciseData.category,
          difficulty: exerciseData.difficulty,
          youtube_video_id: exerciseData.youtube_video_id || null,
          thumbnail_url: exerciseData.thumbnail_url || null,
          created_by: userId,
          is_verified: false // Novos exercícios criados por usuários não são verificados por padrão
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return { exercise, error: null };
    } catch (error) {
      console.error('Error creating exercise:', error);
      return { exercise: null, error: error instanceof Error ? error.message : 'Erro desconhecido ao criar exercício' };
    }
  },

  /**
   * Atualizar um exercício existente
   */
  async updateExercise(exerciseId: string, exerciseData: ExerciseUpdateData): Promise<ExerciseResponse> {
    try {
      const updateData: any = {};

      // Adicionar apenas os campos não nulos/indefinidos ao objeto de atualização
      if (exerciseData.name !== undefined) updateData.name = exerciseData.name;
      if (exerciseData.description !== undefined) updateData.description = exerciseData.description;
      if (exerciseData.muscle_groups !== undefined) updateData.muscle_groups = exerciseData.muscle_groups;
      if (exerciseData.equipment !== undefined) updateData.equipment = exerciseData.equipment;
      if (exerciseData.category !== undefined) updateData.category = exerciseData.category;
      if (exerciseData.difficulty !== undefined) updateData.difficulty = exerciseData.difficulty;
      if (exerciseData.youtube_video_id !== undefined) updateData.youtube_video_id = exerciseData.youtube_video_id;
      if (exerciseData.thumbnail_url !== undefined) updateData.thumbnail_url = exerciseData.thumbnail_url;

      const { data: exercise, error } = await supabase
        .from('exercises')
        .update(updateData)
        .eq('id', exerciseId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return { exercise, error: null };
    } catch (error) {
      console.error('Error updating exercise:', error);
      return { exercise: null, error: error instanceof Error ? error.message : 'Erro desconhecido ao atualizar exercício' };
    }
  },

  /**
   * Deletar um exercício
   */
  async deleteExercise(exerciseId: string): Promise<StatusResponse> {
    try {
      // Verificar se há algum treino usando este exercício
      const { data: usedExercises, error: checkError } = await supabase
        .from('workout_exercises')
        .select('workout_id')
        .eq('exercise_id', exerciseId)
        .limit(1);

      if (checkError) throw new Error(checkError.message);

      // Se o exercício estiver sendo usado, não permitir exclusão
      if (usedExercises && usedExercises.length > 0) {
        return {
          success: false,
          error: 'Este exercício não pode ser excluído porque está sendo usado em um ou mais treinos'
        };
      }

      // Deletar o exercício
      const { error } = await supabase
        .from('exercises')
        .delete()
        .eq('id', exerciseId);

      if (error) throw new Error(error.message);

      return { success: true, error: null };
    } catch (error) {
      console.error('Error deleting exercise:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao deletar exercício' };
    }
  },

  /**
   * Pesquisar exercícios por nome ou descrição
   */
  async searchExercises(query: string): Promise<ExerciseListResponse> {
    try {
      if (!query.trim()) {
        return { exercises: [], error: null };
      }

      const { data: exercises, error } = await supabase
        .from('exercises')
        .select('*')
        .or(`name.ilike.%${query}%,description.ilike.%${query}%`)
        .order('name', { ascending: true });

      if (error) throw new Error(error.message);

      return { exercises: exercises || [], error: null };
    } catch (error) {
      console.error('Error searching exercises:', error);
      return { exercises: [], error: error instanceof Error ? error.message : 'Erro desconhecido ao pesquisar exercícios' };
    }
  }
};

export default ExerciseService; 