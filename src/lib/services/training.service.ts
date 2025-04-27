import supabase from '../supabase';
import { WorkoutSession, ExerciseLog, SessionStatus } from '../../types';

export interface SetLogData {
  exercise_id: string;
  set_number: number;
  reps_completed?: number;
  weight_kg?: number;
  duration_sec?: number;
  was_skipped?: boolean;
  notes?: string;
}

export interface SessionCompletionData {
  duration_minutes?: number;
  perceived_effort?: number;
  mood_rating?: number;
  notes?: string;
}

export interface SessionFilters {
  status?: string;
  startDate?: string;
  endDate?: string;
  workout_id?: string;
}

export interface SessionResponse {
  session: WorkoutSession | null;
  error: string | null;
}

export interface SessionListResponse {
  sessions: WorkoutSession[];
  error: string | null;
}

export interface SessionDetailResponse {
  session: WorkoutSession | null;
  exercise_logs: ExerciseLog[] | null;
  error: string | null;
}

export interface StatusResponse {
  success: boolean;
  error: string | null;
}

export interface ActiveSessionData {
  sessionId: string;
  workoutId: string;
  startedAt: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
  exercises: {
    exerciseId: string;
    name: string;
    sets: number;
    repsPerSet?: number;
    weightKg?: number;
    restAfterSec?: number;
    completed: boolean;
    logs: {
      setIndex: number;
      reps?: number;
      weight?: number;
      completed: boolean;
    }[];
  }[];
  timerState: {
    isResting: boolean;
    remainingSeconds: number;
    totalRestSeconds: number;
  };
}

export const TrainingService = {
  /**
   * Iniciar uma nova sessão de treino
   */
  async startWorkoutSession(workoutId: string, userId: string): Promise<SessionResponse> {
    try {
      const { data, error } = await supabase
        .from('treino_4aivzd_workout_sessions')
        .insert({
          workout_id: workoutId,
          user_id: userId,
          status: SessionStatus.InProgress,
          started_at: new Date().toISOString()
        })
        .select()
        .single();

      if (error) throw new Error(error.message);

      return { session: data, error: null };
    } catch (error) {
      console.error('Error starting workout session:', error);
      return { session: null, error: error instanceof Error ? error.message : 'Erro desconhecido ao iniciar sessão de treino' };
    }
  },

  /**
   * Registrar uma série de exercício
   */
  async logExerciseSet(sessionId: string, setData: SetLogData): Promise<StatusResponse> {
    try {
      const { error } = await supabase
        .from('treino_4aivzd_exercise_logs')
        .insert({
          workout_session_id: sessionId,
          exercise_id: setData.exercise_id,
          set_number: setData.set_number,
          reps_completed: setData.reps_completed,
          weight_kg: setData.weight_kg,
          duration_sec: setData.duration_sec,
          was_skipped: setData.was_skipped || false,
          notes: setData.notes,
          completed_at: new Date().toISOString()
        });

      if (error) throw new Error(error.message);

      return { success: true, error: null };
    } catch (error) {
      console.error('Error logging exercise set:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao registrar série' };
    }
  },

  /**
   * Concluir uma sessão de treino
   */
  async completeSession(sessionId: string, sessionData: SessionCompletionData = {}): Promise<SessionResponse> {
    try {
      // Obter tempo de início da sessão
      const { data: sessionInfo, error: sessionError } = await supabase
        .from('treino_4aivzd_workout_sessions')
        .select('started_at')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw new Error(sessionError.message);

      // Calcular duração em minutos
      const startedAt = new Date(sessionInfo.started_at);
      const completedAt = new Date();
      const durationMinutes = Math.round((completedAt.getTime() - startedAt.getTime()) / 60000);

      // Atualizar sessão
      const { data, error } = await supabase
        .from('treino_4aivzd_workout_sessions')
        .update({
          status: SessionStatus.Completed,
          completed_at: completedAt.toISOString(),
          duration_minutes: sessionData.duration_minutes || durationMinutes,
          perceived_effort: sessionData.perceived_effort,
          mood_rating: sessionData.mood_rating,
          notes: sessionData.notes
        })
        .eq('id', sessionId)
        .select()
        .single();

      if (error) throw new Error(error.message);

      return { session: data, error: null };
    } catch (error) {
      console.error('Error completing workout session:', error);
      return { session: null, error: error instanceof Error ? error.message : 'Erro desconhecido ao concluir sessão de treino' };
    }
  },

  /**
   * Abandonar uma sessão de treino
   */
  async abandonSession(sessionId: string): Promise<StatusResponse> {
    try {
      const { error } = await supabase
        .from('treino_4aivzd_workout_sessions')
        .update({
          status: SessionStatus.Abandoned,
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);

      if (error) throw new Error(error.message);

      return { success: true, error: null };
    } catch (error) {
      console.error('Error abandoning workout session:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao abandonar sessão de treino' };
    }
  },

  /**
   * Pausar uma sessão de treino
   */
  async pauseSession(sessionId: string): Promise<StatusResponse> {
    try {
      const { error } = await supabase
        .from('treino_4aivzd_workout_sessions')
        .update({
          status: SessionStatus.Paused
        })
        .eq('id', sessionId);

      if (error) throw new Error(error.message);

      return { success: true, error: null };
    } catch (error) {
      console.error('Error pausing workout session:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao pausar sessão de treino' };
    }
  },

  /**
   * Retomar uma sessão de treino pausada
   */
  async resumeSession(sessionId: string): Promise<StatusResponse> {
    try {
      const { error } = await supabase
        .from('treino_4aivzd_workout_sessions')
        .update({
          status: SessionStatus.InProgress
        })
        .eq('id', sessionId)
        .eq('status', SessionStatus.Paused);

      if (error) throw new Error(error.message);

      return { success: true, error: null };
    } catch (error) {
      console.error('Error resuming workout session:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao retomar sessão de treino' };
    }
  },

  /**
   * Obter histórico de sessões de treino
   */
  async getSessionHistory(userId: string, filters: SessionFilters = {}): Promise<SessionListResponse> {
    try {
      // Fazer consulta simples sem join para evitar problemas de relacionamento
      let query = supabase
        .from('treino_4aivzd_workout_sessions')
        .select('*')
        .eq('user_id', userId);

      // Aplicar filtros
      if (filters.status) query = query.eq('status', filters.status);
      if (filters.workout_id) query = query.eq('workout_id', filters.workout_id);
      if (filters.startDate) query = query.gte('started_at', filters.startDate);
      if (filters.endDate) query = query.lte('started_at', filters.endDate);

      // Ordenar por data de início (mais recentes primeiro)
      query = query.order('started_at', { ascending: false });

      const { data: sessions, error } = await query;

      if (error) throw new Error(error.message);

      // Se temos sessões, vamos buscar os detalhes dos treinos associados separadamente
      if (sessions && sessions.length > 0) {
        // Obter IDs de workout únicos
        const workoutIds = [...new Set(sessions.map(session => session.workout_id))];
        
        // Buscar workouts associados
        const { data: workouts, error: workoutsError } = await supabase
          .from('treino_4aivzd_workouts')
          .select('*')
          .in('id', workoutIds);
          
        if (workoutsError) throw new Error(workoutsError.message);
        
        // Mapear workouts por ID para lookup fácil
        const workoutsById = Object.fromEntries(
          (workouts || []).map(workout => [workout.id, workout])
        );
        
        // Adicionar informações de workout a cada sessão
        const sessionsWithWorkouts = sessions.map(session => ({
          ...session,
          workout: workoutsById[session.workout_id] || null
        }));
        
        return { sessions: sessionsWithWorkouts, error: null };
      }

      return { sessions: sessions || [], error: null };
    } catch (error) {
      console.error('Error fetching session history:', error);
      return { sessions: [], error: error instanceof Error ? error.message : 'Erro desconhecido ao obter histórico de sessões' };
    }
  },

  /**
   * Obter detalhes de uma sessão específica
   */
  async getSessionDetails(sessionId: string): Promise<SessionDetailResponse> {
    try {
      // Obter detalhes da sessão
      const { data: session, error: sessionError } = await supabase
        .from('treino_4aivzd_workout_sessions')
        .select('*')
        .eq('id', sessionId)
        .single();

      if (sessionError) throw new Error(sessionError.message);

      // Obter informações do workout associado
      let workout = null;
      if (session.workout_id) {
        const { data: workoutData, error: workoutError } = await supabase
          .from('treino_4aivzd_workouts')
          .select('*')
          .eq('id', session.workout_id)
          .single();
          
        if (!workoutError) {
          workout = workoutData;
        }
      }
      
      // Adicionar workout à sessão
      const sessionWithWorkout = {
        ...session,
        workout
      };

      // Obter logs de exercícios
      const { data: logs, error: logsError } = await supabase
        .from('treino_4aivzd_exercise_logs')
        .select('*')
        .eq('workout_session_id', sessionId)
        .order('completed_at', { ascending: true });

      if (logsError) throw new Error(logsError.message);
      
      // Se temos logs, vamos buscar os exercícios associados
      let logsWithExercises = logs || [];
      if (logs && logs.length > 0) {
        // Obter IDs de exercícios únicos
        const exerciseIds = [...new Set(logs.map(log => log.exercise_id))];
        
        // Buscar exercícios
        const { data: exercises, error: exercisesError } = await supabase
          .from('treino_4aivzd_exercises')
          .select('*')
          .in('id', exerciseIds);
          
        if (!exercisesError && exercises) {
          // Mapear exercícios por ID
          const exercisesById = Object.fromEntries(
            exercises.map(exercise => [exercise.id, exercise])
          );
          
          // Adicionar informações de exercício a cada log
          logsWithExercises = logs.map(log => ({
            ...log,
            exercise: exercisesById[log.exercise_id] || null
          }));
        }
      }

      return { 
        session: sessionWithWorkout, 
        exercise_logs: logsWithExercises, 
        error: null 
      };
    } catch (error) {
      console.error('Error fetching session details:', error);
      return { 
        session: null, 
        exercise_logs: null, 
        error: error instanceof Error ? error.message : 'Erro desconhecido ao obter detalhes da sessão' 
      };
    }
  },

  /**
   * Sincronizar sessões de treino offline
   */
  async syncOfflineSessions(sessions: any[]): Promise<StatusResponse> {
    try {
      // Processar cada sessão offline
      for (const session of sessions) {
        // Inserir a sessão
        const { data: insertedSession, error: sessionError } = await supabase
          .from('treino_4aivzd_workout_sessions')
          .insert({
            id: session.sessionId, // Usar o ID offline para garantir que não haja duplicatas
            workout_id: session.workoutId,
            user_id: session.userId,
            status: SessionStatus.Completed,
            started_at: session.startedAt,
            completed_at: session.completedAt,
            duration_minutes: session.durationMinutes,
            perceived_effort: session.perceivedEffort,
            mood_rating: session.moodRating,
            notes: session.notes
          })
          .select()
          .single();

        if (sessionError) {
          console.error('Error syncing offline session:', sessionError);
          continue; // Continuar com a próxima sessão
        }

        // Inserir os logs de exercícios
        if (session.exerciseLogs && session.exerciseLogs.length > 0) {
          const logsToInsert = session.exerciseLogs.map((log: any) => ({
            workout_session_id: insertedSession.id,
            exercise_id: log.exerciseId,
            set_number: log.setNumber,
            reps_completed: log.repsCompleted,
            weight_kg: log.weightKg,
            duration_sec: log.durationSec,
            was_skipped: log.wasSkipped,
            notes: log.notes,
            completed_at: log.completedAt || new Date().toISOString()
          }));

          await supabase
            .from('treino_4aivzd_exercise_logs')
            .insert(logsToInsert);
        }
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Error syncing offline sessions:', error);
      return { success: false, error: error instanceof Error ? error.message : 'Erro desconhecido ao sincronizar sessões offline' };
    }
  }
};

export default TrainingService; 