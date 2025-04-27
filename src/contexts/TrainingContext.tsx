import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { TrainingService, LocalStorageService } from '../lib/services';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';
import { WorkoutSession, ExerciseLog } from '../types';
import { SetProgressData } from '../lib/services/local-storage.service';
// import { v4 as uuidv4 } from 'uuid';

// Interface para a sessão ativa
interface ActiveSessionData {
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

interface TrainingContextType {
  activeSession: ActiveSessionData | null;
  isLoading: boolean;
  error: string | null;
  isResting: boolean;
  remainingRestTime: number;
  startWorkout: (workoutId: string, exercises: any[]) => Promise<void>;
  completeWorkout: (data: { perceivedEffort?: number; moodRating?: number; notes?: string }) => Promise<void>;
  abandonWorkout: () => Promise<void>;
  pauseWorkout: () => Promise<void>;
  resumeWorkout: () => Promise<void>;
  logExerciseSet: (exerciseIndex: number, setIndex: number, data: { reps?: number; weight?: number; skipped?: boolean }) => Promise<void>;
  moveToExercise: (exerciseIndex: number) => void;
  startRest: (seconds: number) => void;
  skipRest: () => void;
  getSessionHistory: () => Promise<WorkoutSession[]>;
  getSessionDetails: (sessionId: string) => Promise<{ session: WorkoutSession | null; logs: ExerciseLog[] | null }>;
}

const TrainingContext = createContext<TrainingContextType | undefined>(undefined);

export function TrainingProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [activeSession, setActiveSession] = useState<ActiveSessionData | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isResting, setIsResting] = useState(false);
  const [remainingRestTime, setRemainingRestTime] = useState(0);
  const [restTimerId, setRestTimerId] = useState<number | null>(null);

  // Verificar sessão no localStorage ao montar o componente
  useEffect(() => {
    const storedSession = LocalStorageService.getActiveSession();
    
    if (storedSession) {
      setActiveSession(storedSession);
      
      // Recuperar estado do timer se estiver em descanso
      if (storedSession.timerState.isResting) {
        setIsResting(true);
        setRemainingRestTime(storedSession.timerState.remainingSeconds);
        startRestTimer(storedSession.timerState.remainingSeconds);
      }
    }
  }, []);

  // Verificar sessões pendentes de sincronização (quando o usuário está online)
  useEffect(() => {
    if (user) {
      syncPendingSessions();
    }
  }, [user]);

  // Iniciar um novo treino
  const startWorkout = async (workoutId: string, workoutExercises: any[]) => {
    if (!user) {
      toast.error('Você precisa estar logado para iniciar um treino');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Verificar se já existe uma sessão ativa
      if (activeSession) {
        toast.warning('Você já tem um treino em andamento. Conclua ou abandone-o antes de iniciar outro.');
        return;
      }
      
      // Iniciar uma nova sessão no servidor
      const { session, error: sessionError } = await TrainingService.startWorkoutSession(workoutId, user.id);
      
      if (sessionError || !session) {
        throw new Error(sessionError || 'Erro ao iniciar sessão de treino');
      }
      
      // Criar estado local para a sessão ativa
      const exercises = workoutExercises.map(ex => ({
        exerciseId: ex.exercise_id,
        name: ex.exercise.name,
        sets: ex.sets,
        repsPerSet: ex.reps_per_set,
        weightKg: ex.weight_kg,
        restAfterSec: ex.rest_after_sec || 60,
        completed: false,
        logs: Array.from({ length: ex.sets }, (_, i) => ({
          setIndex: i,
          reps: ex.reps_per_set,
          weight: ex.weight_kg,
          completed: false
        }))
      }));
      
      const newActiveSession: ActiveSessionData = {
        sessionId: session.id,
        workoutId,
        startedAt: session.started_at,
        currentExerciseIndex: 0,
        currentSetIndex: 0,
        exercises,
        timerState: {
          isResting: false,
          remainingSeconds: 0,
          totalRestSeconds: 0
        }
      };
      
      // Salvar a sessão localmente
      LocalStorageService.saveActiveSession(newActiveSession);
      setActiveSession(newActiveSession);
      
      toast.success('Treino iniciado com sucesso!');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao iniciar treino';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao iniciar treino:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Completar um treino
  const completeWorkout = async (data: { perceivedEffort?: number; moodRating?: number; notes?: string }) => {
    if (!activeSession) {
      toast.error('Não há treino ativo para completar');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Calcular duração em minutos
      const startTime = new Date(activeSession.startedAt);
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      
      const completionData = {
        ...data,
        duration_minutes: durationMinutes
      };
      
      // Tentar enviar ao servidor se estiver online e logado
      if (navigator.onLine && user) {
        // Sincronizar logs de séries primeiro
        await syncSessionLogs();
        
        // Completar a sessão no servidor
        const { error: completionError } = await TrainingService.completeSession(
          activeSession.sessionId,
          completionData
        );
        
        if (completionError) {
          throw new Error(completionError);
        }
        
        // Limpar temporizador de descanso se estiver ativo
        if (restTimerId !== null) {
          clearInterval(restTimerId);
          setRestTimerId(null);
        }
        
        // Limpar a sessão ativa local
        LocalStorageService.clearActiveSession();
        setActiveSession(null);
        setIsResting(false);
        setRemainingRestTime(0);
        
        toast.success('Treino concluído com sucesso!');
      } else {
        // Salvar localmente para sincronização posterior
        const sessionData = LocalStorageService.getAllSessionData({
          userId: user?.id || '',
          completedAt: new Date().toISOString(),
          durationMinutes,
          perceivedEffort: data.perceivedEffort,
          moodRating: data.moodRating,
          notes: data.notes
        });
        
        if (sessionData) {
          LocalStorageService.savePendingSync(sessionData);
          LocalStorageService.clearActiveSession();
          setActiveSession(null);
          setIsResting(false);
          setRemainingRestTime(0);
          
          toast.success('Treino salvo localmente. Será sincronizado quando você estiver online.');
        } else {
          throw new Error('Erro ao salvar treino localmente');
        }
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao completar treino';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao completar treino:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Abandonar um treino
  const abandonWorkout = async () => {
    if (!activeSession) {
      toast.error('Não há treino ativo para abandonar');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (navigator.onLine && user) {
        const { success, error: abandonError } = await TrainingService.abandonSession(activeSession.sessionId);
        
        if (!success) {
          throw new Error(abandonError || 'Erro ao abandonar treino');
        }
      }
      
      // Limpar temporizador de descanso se estiver ativo
      if (restTimerId !== null) {
        clearInterval(restTimerId);
        setRestTimerId(null);
      }
      
      // Limpar a sessão ativa local
      LocalStorageService.clearActiveSession();
      setActiveSession(null);
      setIsResting(false);
      setRemainingRestTime(0);
      
      toast.info('Treino abandonado');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao abandonar treino';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao abandonar treino:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Pausar um treino
  const pauseWorkout = async () => {
    if (!activeSession) {
      toast.error('Não há treino ativo para pausar');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (navigator.onLine && user) {
        const { success, error: pauseError } = await TrainingService.pauseSession(activeSession.sessionId);
        
        if (!success) {
          throw new Error(pauseError || 'Erro ao pausar treino');
        }
      }
      
      // Pausar o temporizador de descanso se estiver ativo
      if (restTimerId !== null) {
        clearInterval(restTimerId);
        setRestTimerId(null);
        
        // Atualizar estado no localStorage
        LocalStorageService.updateTimerState(true, remainingRestTime, activeSession.timerState.totalRestSeconds);
      }
      
      toast.info('Treino pausado');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao pausar treino';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao pausar treino:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Retomar um treino pausado
  const resumeWorkout = async () => {
    if (!activeSession) {
      toast.error('Não há treino pausado para retomar');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      if (navigator.onLine && user) {
        const { success, error: resumeError } = await TrainingService.resumeSession(activeSession.sessionId);
        
        if (!success) {
          throw new Error(resumeError || 'Erro ao retomar treino');
        }
      }
      
      // Retomar o temporizador de descanso se estava ativo
      if (activeSession.timerState.isResting) {
        startRestTimer(activeSession.timerState.remainingSeconds);
      }
      
      toast.info('Treino retomado');
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao retomar treino';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao retomar treino:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Registrar uma série de exercício
  const logExerciseSet = async (exerciseIndex: number, setIndex: number, data: { reps?: number; weight?: number; skipped?: boolean }) => {
    if (!activeSession) {
      toast.error('Não há treino ativo');
      return;
    }
    
    setIsLoading(true);
    setError(null);
    
    try {
      // Atualizar localmente
      const setData: SetProgressData = {
        exerciseIndex,
        setIndex,
        reps: data.reps,
        weight: data.weight,
        completed: !data.skipped,
        skipped: data.skipped
      };
      
      LocalStorageService.updateSessionProgress(setData);
      
      // Obter a sessão atualizada
      const updatedSession = LocalStorageService.getActiveSession();
      
      if (!updatedSession) {
        throw new Error('Erro ao atualizar progresso');
      }
      
      setActiveSession(updatedSession);
      
      // Iniciar descanso automático se não for a última série ou o exercício estiver concluído
      const exercise = updatedSession.exercises[exerciseIndex];
      const isLastSet = setIndex === exercise.logs.length - 1;
      
      if (!data.skipped && !isLastSet) {
        // Próxima série do mesmo exercício
        startRest(exercise.restAfterSec || 60);
      } else if (!data.skipped && isLastSet && exercise.completed) {
        // Ir para o próximo exercício
        const nextExerciseIndex = exerciseIndex + 1;
        if (nextExerciseIndex < updatedSession.exercises.length) {
          const nextExercise = updatedSession.exercises[nextExerciseIndex];
          startRest(nextExercise.restAfterSec || 60);
        }
      }
      
      // Tentar sincronizar com o servidor se estiver online
      if (navigator.onLine && user) {
        syncSetLog(exerciseIndex, setIndex);
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao registrar série';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao registrar série:', err);
    } finally {
      setIsLoading(false);
    }
  };

  // Navegar para um exercício específico
  const moveToExercise = (exerciseIndex: number) => {
    if (!activeSession) return;
    
    // Verificar se o índice é válido
    if (exerciseIndex < 0 || exerciseIndex >= activeSession.exercises.length) {
      toast.error('Exercício inválido');
      return;
    }
    
    // Atualizar o índice atual
    const updatedSession = {
      ...activeSession,
      currentExerciseIndex: exerciseIndex,
      currentSetIndex: 0
    };
    
    // Salvar no localStorage
    LocalStorageService.saveActiveSession(updatedSession);
    setActiveSession(updatedSession);
  };

  // Iniciar temporizador de descanso
  const startRest = (seconds: number) => {
    // Limpar o temporizador anterior se existir
    if (restTimerId !== null) {
      clearInterval(restTimerId);
    }
    
    // Iniciar novo temporizador
    setIsResting(true);
    setRemainingRestTime(seconds);
    
    // Atualizar estado no localStorage
    if (activeSession) {
      LocalStorageService.updateTimerState(true, seconds, seconds);
    }
    
    startRestTimer(seconds);
  };

  // Função auxiliar para iniciar o temporizador
  const startRestTimer = (seconds: number) => {
    setRemainingRestTime(seconds);
    
    const timerId = window.setInterval(() => {
      setRemainingRestTime(prevTime => {
        const newTime = prevTime - 1;
        
        // Atualizar estado no localStorage
        if (activeSession) {
          LocalStorageService.updateTimerState(true, newTime, activeSession.timerState.totalRestSeconds);
        }
        
        // Verificar se o tempo acabou
        if (newTime <= 0) {
          clearInterval(timerId);
          setIsResting(false);
          
          // Notificar fim do descanso
          toast.info('Descanso concluído!');
          
          // Reproduzir um som de alerta (se implementado)
          
          // Atualizar estado no localStorage
          if (activeSession) {
            LocalStorageService.updateTimerState(false, 0, 0);
          }
          
          return 0;
        }
        
        return newTime;
      });
    }, 1000);
    
    setRestTimerId(timerId);
  };

  // Pular o tempo de descanso
  const skipRest = () => {
    if (restTimerId !== null) {
      clearInterval(restTimerId);
      setRestTimerId(null);
    }
    
    setIsResting(false);
    setRemainingRestTime(0);
    
    // Atualizar estado no localStorage
    if (activeSession) {
      LocalStorageService.updateTimerState(false, 0, 0);
    }
    
    toast.info('Descanso pulado');
  };

  // Buscar histórico de sessões
  const getSessionHistory = async (): Promise<WorkoutSession[]> => {
    if (!user) return [];
    
    setIsLoading(true);
    setError(null);
    
    try {
      const { sessions, error: historyError } = await TrainingService.getSessionHistory(user.id);
      
      if (historyError) {
        throw new Error(historyError);
      }
      
      return sessions;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar histórico';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao buscar histórico:', err);
      return [];
    } finally {
      setIsLoading(false);
    }
  };

  // Buscar detalhes de uma sessão
  const getSessionDetails = async (sessionId: string): Promise<{ session: WorkoutSession | null; logs: ExerciseLog[] | null }> => {
    setIsLoading(true);
    setError(null);
    
    try {
      const { session, exercise_logs, error: detailsError } = await TrainingService.getSessionDetails(sessionId);
      
      if (detailsError) {
        throw new Error(detailsError);
      }
      
      return { session, logs: exercise_logs };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao buscar detalhes da sessão';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao buscar detalhes da sessão:', err);
      return { session: null, logs: null };
    } finally {
      setIsLoading(false);
    }
  };

  // Funções auxiliares para sincronização
  const syncSetLog = async (exerciseIndex: number, setIndex: number) => {
    if (!activeSession || !user) return;
    
    try {
      const exercise = activeSession.exercises[exerciseIndex];
      const log = exercise.logs[setIndex];
      
      if (!log) return;
      
      const setData = {
        exercise_id: exercise.exerciseId,
        set_number: setIndex + 1,
        reps_completed: log.reps,
        weight_kg: log.weight,
        was_skipped: !log.completed
      };
      
      await TrainingService.logExerciseSet(activeSession.sessionId, setData);
    } catch (error) {
      console.error('Erro ao sincronizar log de série:', error);
      // Não interromper o fluxo do usuário em caso de erro de sincronização
    }
  };

  const syncSessionLogs = async () => {
    if (!activeSession || !user) return;
    
    try {
      // Sincronizar todos os logs de séries completadas
      for (let i = 0; i < activeSession.exercises.length; i++) {
        const exercise = activeSession.exercises[i];
        
        for (let j = 0; j < exercise.logs.length; j++) {
          const log = exercise.logs[j];
          
          // Apenas sincronizar séries completadas ou puladas
          if (log.completed || exercise.completed) {
            await syncSetLog(i, j);
          }
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar logs de séries:', error);
    }
  };

  const syncPendingSessions = async () => {
    if (!user || !navigator.onLine) return;
    
    try {
      const pendingSessions = LocalStorageService.getPendingSyncSessions();
      
      if (pendingSessions.length > 0) {
        console.log(`Sincronizando ${pendingSessions.length} sessões pendentes...`);
        
        // Adicionar ID do usuário a todas as sessões pendentes
        const sessionsWithUserId = pendingSessions.map(session => ({
          ...session,
          userId: user.id
        }));
        
        const { success } = await TrainingService.syncOfflineSessions(sessionsWithUserId);
        
        if (success) {
          // Limpar todas as sessões pendentes
          LocalStorageService.clearAllPendingSyncSessions();
          console.log('Sessões pendentes sincronizadas com sucesso');
        }
      }
    } catch (error) {
      console.error('Erro ao sincronizar sessões pendentes:', error);
    }
  };

  const value = {
    activeSession,
    isLoading,
    error,
    isResting,
    remainingRestTime,
    startWorkout,
    completeWorkout,
    abandonWorkout,
    pauseWorkout,
    resumeWorkout,
    logExerciseSet,
    moveToExercise,
    startRest,
    skipRest,
    getSessionHistory,
    getSessionDetails
  };

  return <TrainingContext.Provider value={value}>{children}</TrainingContext.Provider>;
}

export function useTraining() {
  const context = useContext(TrainingContext);
  
  if (context === undefined) {
    throw new Error('useTraining deve ser usado dentro de um TrainingProvider');
  }
  
  return context;
} 