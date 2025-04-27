import { ActiveSessionData } from './training.service';

const ACTIVE_SESSION_KEY = 'treino-na-mao:active-session';
const PENDING_SYNC_SESSIONS_KEY = 'treino-na-mao:pending-sync-sessions';

export interface SetProgressData {
  exerciseIndex: number;
  setIndex: number;
  reps?: number;
  weight?: number;
  completed: boolean;
  skipped?: boolean;
}

export interface CompleteSessionData {
  sessionId: string;
  workoutId: string;
  userId: string;
  startedAt: string;
  completedAt: string;
  durationMinutes?: number;
  perceivedEffort?: number;
  moodRating?: number;
  notes?: string;
  exerciseLogs: {
    exerciseId: string;
    setNumber: number;
    repsCompleted?: number;
    weightKg?: number;
    durationSec?: number;
    wasSkipped: boolean;
    notes?: string;
    completedAt: string;
  }[];
}

export const LocalStorageService = {
  /**
   * Salvar sessão ativa no localStorage
   */
  saveActiveSession(sessionData: ActiveSessionData): void {
    try {
      localStorage.setItem(ACTIVE_SESSION_KEY, JSON.stringify(sessionData));
    } catch (error) {
      console.error('Error saving active session to localStorage:', error);
    }
  },

  /**
   * Obter sessão ativa do localStorage
   */
  getActiveSession(): ActiveSessionData | null {
    try {
      const data = localStorage.getItem(ACTIVE_SESSION_KEY);
      if (!data) return null;
      return JSON.parse(data) as ActiveSessionData;
    } catch (error) {
      console.error('Error getting active session from localStorage:', error);
      return null;
    }
  },

  /**
   * Atualizar progresso de uma série específica
   */
  updateSessionProgress(setData: SetProgressData): void {
    try {
      const session = this.getActiveSession();
      if (!session) return;

      const { exerciseIndex, setIndex, reps, weight, completed, skipped } = setData;
      
      // Verificar se os índices são válidos
      if (exerciseIndex < 0 || exerciseIndex >= session.exercises.length) return;
      if (setIndex < 0 || setIndex >= session.exercises[exerciseIndex].logs.length) return;

      // Atualizar os dados da série
      const exerciseLogs = session.exercises[exerciseIndex].logs;
      exerciseLogs[setIndex] = {
        ...exerciseLogs[setIndex],
        reps: reps !== undefined ? reps : exerciseLogs[setIndex].reps,
        weight: weight !== undefined ? weight : exerciseLogs[setIndex].weight,
        completed: skipped ? false : completed
      };

      // Verificar se todas as séries do exercício foram completadas
      const allSetsCompleted = exerciseLogs.every(log => log.completed || skipped);
      session.exercises[exerciseIndex].completed = allSetsCompleted;

      // Atualizar o índice atual se o exercício atual foi concluído
      if (allSetsCompleted && exerciseIndex === session.currentExerciseIndex) {
        // Encontrar o próximo exercício não concluído
        const nextExerciseIndex = session.exercises.findIndex(
          (exercise, index) => index > exerciseIndex && !exercise.completed
        );

        // Atualizar os índices se houver próximo exercício
        if (nextExerciseIndex !== -1) {
          session.currentExerciseIndex = nextExerciseIndex;
          session.currentSetIndex = 0;
        }
      }

      // Salvar a sessão atualizada
      this.saveActiveSession(session);
    } catch (error) {
      console.error('Error updating session progress:', error);
    }
  },

  /**
   * Atualizar estado do timer
   */
  updateTimerState(isResting: boolean, remainingSeconds: number, totalRestSeconds: number): void {
    try {
      const session = this.getActiveSession();
      if (!session) return;

      session.timerState = {
        isResting,
        remainingSeconds,
        totalRestSeconds
      };

      this.saveActiveSession(session);
    } catch (error) {
      console.error('Error updating timer state:', error);
    }
  },

  /**
   * Limpar sessão ativa
   */
  clearActiveSession(): void {
    try {
      localStorage.removeItem(ACTIVE_SESSION_KEY);
    } catch (error) {
      console.error('Error clearing active session from localStorage:', error);
    }
  },

  /**
   * Obter todos os dados da sessão para finalização/sincronização
   */
  getAllSessionData(completeData: Partial<CompleteSessionData> = {}): CompleteSessionData | null {
    try {
      const activeSession = this.getActiveSession();
      if (!activeSession) return null;

      // Mapear dados para o formato completo
      const exerciseLogs = activeSession.exercises.flatMap(exercise => 
        exercise.logs.map((log, index) => ({
          exerciseId: exercise.exerciseId,
          setNumber: index + 1,
          repsCompleted: log.reps,
          weightKg: log.weight,
          durationSec: undefined,
          wasSkipped: !log.completed,
          notes: undefined,
          completedAt: new Date().toISOString()
        }))
      );

      return {
        sessionId: activeSession.sessionId,
        workoutId: activeSession.workoutId,
        userId: completeData.userId || '',
        startedAt: activeSession.startedAt,
        completedAt: completeData.completedAt || new Date().toISOString(),
        durationMinutes: completeData.durationMinutes,
        perceivedEffort: completeData.perceivedEffort,
        moodRating: completeData.moodRating,
        notes: completeData.notes,
        exerciseLogs
      };
    } catch (error) {
      console.error('Error getting all session data:', error);
      return null;
    }
  },

  /**
   * Salvar sessão pendente de sincronização
   */
  savePendingSync(sessionData: CompleteSessionData): void {
    try {
      // Obter sessões pendentes existentes
      const existingSessions = this.getPendingSyncSessions();
      
      // Adicionar nova sessão
      existingSessions.push(sessionData);
      
      // Salvar no localStorage
      localStorage.setItem(PENDING_SYNC_SESSIONS_KEY, JSON.stringify(existingSessions));
    } catch (error) {
      console.error('Error saving pending sync session:', error);
    }
  },

  /**
   * Obter sessões pendentes de sincronização
   */
  getPendingSyncSessions(): CompleteSessionData[] {
    try {
      const data = localStorage.getItem(PENDING_SYNC_SESSIONS_KEY);
      if (!data) return [];
      return JSON.parse(data) as CompleteSessionData[];
    } catch (error) {
      console.error('Error getting pending sync sessions:', error);
      return [];
    }
  },

  /**
   * Limpar uma sessão específica da lista de pendentes
   */
  clearPendingSyncSession(sessionId: string): void {
    try {
      const sessions = this.getPendingSyncSessions();
      const updatedSessions = sessions.filter(session => session.sessionId !== sessionId);
      localStorage.setItem(PENDING_SYNC_SESSIONS_KEY, JSON.stringify(updatedSessions));
    } catch (error) {
      console.error('Error clearing pending sync session:', error);
    }
  },

  /**
   * Limpar todas as sessões pendentes
   */
  clearAllPendingSyncSessions(): void {
    try {
      localStorage.removeItem(PENDING_SYNC_SESSIONS_KEY);
    } catch (error) {
      console.error('Error clearing all pending sync sessions:', error);
    }
  },

  /**
   * Verificar se existe uma sessão ativa ou pendente
   */
  hasActiveOrPendingSession(): boolean {
    try {
      return !!this.getActiveSession() || this.getPendingSyncSessions().length > 0;
    } catch (error) {
      console.error('Error checking for active or pending sessions:', error);
      return false;
    }
  }
};

export default LocalStorageService; 