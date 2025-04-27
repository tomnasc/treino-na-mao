import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/supabase';
import { Workout, Exercise, WorkoutExercise, SessionStatus } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { toast } from 'sonner';

// Controle global para evitar mostrar a mensagem mais de uma vez na mesma sessão
const shownToastSessionIds = new Set<string>();
const shownRecoverySessionIds = new Set<string>();

interface WorkoutSessionData {
  id: string;
  workout_id: string;
  user_id: string;
  status: SessionStatus;
  started_at: string;
  current_exercise_index: number;
  current_set_index: number;
  exercise_logs: {
    exercise_id: string;
    set_number: number;
    reps_completed?: number;
    weight_kg?: number;
    completed: boolean;
    skipped: boolean;
    completed_at?: string;
  }[];
}

interface ExerciseLogData {
  workout_session_id: string;
  exercise_id: string;
  set_number: number;
  reps_completed?: number;
  weight_kg?: number;
  completed_at?: string;
  was_skipped: boolean;
}

interface SetCompletionData {
  reps?: number;
  weight?: number;
  duration_sec?: number;
}

export interface UseWorkoutSessionResult {
  workout: Workout | null;
  workoutExercises: (WorkoutExercise & { exercise: Exercise })[];
  isLoading: boolean;
  sessionId: string;
  currentExerciseIndex: number;
  currentSetIndex: number;
  exerciseLogs: Record<string, any[]>;
  currentExercise: (WorkoutExercise & { exercise: Exercise }) | undefined;
  currentLog: any[] | null;
  isLastExercise: boolean;
  isLastSet: boolean;
  currentReps: number | '';
  currentWeight: number | '';
  setCurrentReps: (reps: number | '') => void;
  setCurrentWeight: (weight: number | '') => void;
  completeSet: (data?: SetCompletionData) => void;
  skipSet: () => void;
  moveToNextSet: () => void;
  moveToNextExercise: () => void;
  jumpToExercise: (index: number) => void;
  showCompletionDialog: boolean;
  setShowCompletionDialog: (show: boolean) => void;
  sessionNotes: string;
  setSessionNotes: (notes: string) => void;
  perceivedEffort: number;
  setPerceivedEffort: (effort: number) => void;
  finishWorkout: () => Promise<void>;
  loadWorkoutDetails: () => Promise<void>;
}

export function useWorkoutSession(workoutId: string | undefined): UseWorkoutSessionResult {
  const { user } = useAuth();
  
  // Estados para dados básicos
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [workoutExercises, setWorkoutExercises] = useState<(WorkoutExercise & { exercise: Exercise })[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Estados para a sessão
  const [sessionId, setSessionId] = useState<string>('');
  const [currentExerciseIndex, setCurrentExerciseIndex] = useState(0);
  const [currentSetIndex, setCurrentSetIndex] = useState(0);
  const [exerciseLogs, setExerciseLogs] = useState<Record<string, any[]>>({});
  
  // Estados para as métricas do set atual
  const [currentReps, setCurrentReps] = useState<number | ''>('');
  const [currentWeight, setCurrentWeight] = useState<number | ''>('');
  
  // Estados para diálogos
  const [showCompletionDialog, setShowCompletionDialog] = useState(false);
  const [sessionNotes, setSessionNotes] = useState('');
  const [perceivedEffort, setPerceivedEffort] = useState<number>(5);
  
  // Referência para o estado da sessão
  const sessionStateRef = useRef<{
    currentExerciseIndex: number;
    currentSetIndex: number;
    exerciseLogs: Record<string, any[]>;
  }>({
    currentExerciseIndex: 0,
    currentSetIndex: 0,
    exerciseLogs: {}
  });
  
  // Computed values
  const currentExercise = workoutExercises[currentExerciseIndex];
  const currentLog = currentExercise ? exerciseLogs[currentExercise.exercise_id] : null;
  const isLastExercise = currentExerciseIndex === workoutExercises.length - 1;
  const isLastSet = currentExercise ? currentSetIndex === currentExercise.sets - 1 : false;
  
  // Atualizar o ref do estado da sessão
  useEffect(() => {
    sessionStateRef.current = {
      currentExerciseIndex,
      currentSetIndex,
      exerciseLogs
    };
  }, [currentExerciseIndex, currentSetIndex, exerciseLogs]);
  
  // Função para limpar sessões duplicadas
  const cleanupDuplicateSessions = async (workoutId: string, userId: string) => {
    try {
      // Verificar quantas sessões em andamento existem para este treino/usuário
      const { data: sessions, error: countError } = await supabase
        .from('treino_4aivzd_workout_sessions')
        .select('id, started_at')
        .eq('workout_id', workoutId)
        .eq('user_id', userId)
        .eq('status', SessionStatus.InProgress)
        .order('started_at', { ascending: false });
      
      if (countError) {
        console.error('Erro ao contar sessões existentes:', countError);
        return null;
      }
      
      // Se existir mais de uma sessão em andamento, marcar todas as antigas como abandonadas
      if (sessions && sessions.length > 1) {
        console.log(`Detectadas ${sessions.length} sessões em andamento para o mesmo treino. Limpando...`);
        
        // Preservar apenas a sessão mais recente
        const mostRecentSession = sessions[0];
        const oldSessionIds = sessions.slice(1).map(s => s.id);
        
        if (oldSessionIds.length > 0) {
          const { error: updateError } = await supabase
            .from('treino_4aivzd_workout_sessions')
            .update({ 
              status: SessionStatus.Abandoned
            })
            .in('id', oldSessionIds);
          
          if (updateError) {
            console.error('Erro ao abandonar sessões antigas:', updateError);
          } else {
            console.log(`${oldSessionIds.length} sessões antigas marcadas como abandonadas.`);
          }
        }
        
        // Retornar a sessão mais recente
        return mostRecentSession;
      }
      
      // Se apenas uma sessão existir, retorná-la
      if (sessions && sessions.length === 1) {
        return sessions[0];
      }
      
      // Se nenhuma sessão existir, retornar null
      return null;
    } catch (error) {
      console.error('Erro durante a limpeza de sessões duplicadas:', error);
      return null;
    }
  };
  
  // Criar uma nova sessão de treino
  const createWorkoutSession = async (workoutId: string) => {
    if (!user) return;
    
    try {
      // Não precisamos marcar sessões como abandonadas aqui, pois cleanupDuplicateSessions já faz isso
      
      // Criar uma nova sessão
      const sessionId = uuidv4();
      
      const sessionData = {
        id: sessionId,
        workout_id: workoutId,
        user_id: user.id,
        status: SessionStatus.InProgress,
        started_at: new Date().toISOString(),
      };
      
      // Save to local storage first
      const completeSessionData: WorkoutSessionData = {
        ...sessionData,
        current_exercise_index: 0,
        current_set_index: 0,
        exercise_logs: [],
      };
      saveSessionToLocalStorage(completeSessionData);
      
      // Save session start time for duration calculation
      localStorage.setItem('sessionStartTime', new Date().toISOString());
      
      // Then save to database
      const { error } = await supabase
        .from('treino_4aivzd_workout_sessions')
        .insert(sessionData);
      
      if (error) throw error;
      
      setSessionId(sessionId);
    } catch (error) {
      console.error('Error creating workout session:', error);
      toast.error('Erro ao iniciar sessão de treino');
    }
  };
  
  // Salvar estado da sessão no localStorage
  const saveSessionToLocalStorage = (sessionData: WorkoutSessionData) => {
    localStorage.setItem('activeWorkoutSession', JSON.stringify(sessionData));
  };
  
  // Persistir estado completo da sessão no localStorage cada vez que muda
  useEffect(() => {
    if (sessionId && workout) {
      const sessionData: WorkoutSessionData = {
        id: sessionId,
        workout_id: workout.id,
        user_id: user?.id || '',
        status: SessionStatus.InProgress,
        started_at: new Date().toISOString(),
        current_exercise_index: currentExerciseIndex,
        current_set_index: currentSetIndex,
        exercise_logs: Object.entries(exerciseLogs).flatMap(([exerciseId, logs]) => 
          logs.map(log => ({
            exercise_id: exerciseId,
            set_number: log.set_number,
            reps_completed: log.reps_completed,
            weight_kg: log.weight_kg,
            completed: log.completed,
            skipped: log.skipped,
            completed_at: log.completed_at
          }))
        )
      };
      
      localStorage.setItem('activeWorkoutSession', JSON.stringify(sessionData));
    }
  }, [sessionId, workout, currentExerciseIndex, currentSetIndex, exerciseLogs, user]);
  
  // Recuperar estado salvo ao montar o componente
  useEffect(() => {
    try {
      const savedSession = localStorage.getItem('activeWorkoutSession');
      if (savedSession && !isLoading) {
        const sessionData = JSON.parse(savedSession) as WorkoutSessionData;
        
        // Verificar se é a mesma sessão do workout atual
        if (sessionData.workout_id === workoutId) {
          // Restaurar índices
          setCurrentExerciseIndex(sessionData.current_exercise_index);
          setCurrentSetIndex(sessionData.current_set_index);
          
          // Restaurar logs se tiver exercícios carregados
          if (workoutExercises.length > 0 && sessionData.exercise_logs.length > 0) {
            // Converter o array de logs para o formato esperado pela aplicação
            const logsMap: Record<string, any[]> = {};
            
            // Inicializar com a estrutura padrão
            workoutExercises.forEach(ex => {
              logsMap[ex.exercise_id] = Array(ex.sets).fill(null).map((_, idx) => ({
                set_number: idx + 1,
                completed: false,
                skipped: false,
              }));
            });
            
            // Preencher com os dados salvos
            sessionData.exercise_logs.forEach(log => {
              const exerciseId = log.exercise_id;
              const setIndex = log.set_number - 1;
              
              if (logsMap[exerciseId] && logsMap[exerciseId][setIndex]) {
                logsMap[exerciseId][setIndex] = {
                  ...logsMap[exerciseId][setIndex],
                  ...log
                };
              }
            });
            
            setExerciseLogs(logsMap);
          }
        }
      }
    } catch (error) {
      console.error('Error restoring session state:', error);
    }
  }, [workoutId, workoutExercises, isLoading]);
  
  // Handler functions for user actions
  const completeSet = useCallback((data?: SetCompletionData) => {
    if (!currentExercise || !currentLog) return;
    
    // Update the log for the current set
    const updatedLogs = { ...exerciseLogs };
    updatedLogs[currentExercise.exercise_id][currentSetIndex] = {
      ...updatedLogs[currentExercise.exercise_id][currentSetIndex],
      completed: true,
      skipped: false,
      reps_completed: data?.reps || currentReps || currentExercise.reps_per_set,
      weight_kg: data?.weight || currentWeight || undefined,
      duration_sec: data?.duration_sec || currentExercise.duration_sec,
      completed_at: new Date().toISOString(),
    };
    
    setExerciseLogs(updatedLogs);
    
    // Determine what happens next
    if (isLastSet) {
      // Last set of this exercise
      if (isLastExercise) {
        // Workout is complete
        setShowCompletionDialog(true);
      } else {
        // Move to next exercise
        moveToNextExercise();
      }
    } else {
      // Move to next set
      moveToNextSet();
    }
  }, [currentExercise, currentLog, exerciseLogs, currentSetIndex, isLastSet, isLastExercise, currentReps, currentWeight]);

  const skipSet = useCallback(() => {
    if (!currentExercise || !currentLog) return;
    
    // Mark current set as skipped
    const updatedLogs = { ...exerciseLogs };
    updatedLogs[currentExercise.exercise_id][currentSetIndex] = {
      ...updatedLogs[currentExercise.exercise_id][currentSetIndex],
      completed: false,
      skipped: true,
      completed_at: new Date().toISOString(),
    };
    
    setExerciseLogs(updatedLogs);
    
    // Determine what happens next (same logic as complete)
    if (isLastSet) {
      if (isLastExercise) {
        setShowCompletionDialog(true);
      } else {
        moveToNextExercise();
      }
    } else {
      moveToNextSet();
    }
  }, [currentExercise, currentLog, exerciseLogs, currentSetIndex, isLastSet, isLastExercise]);

  const moveToNextSet = useCallback(() => {
    // Move to next set
    setCurrentSetIndex(prev => prev + 1);
    
    // Reset current values
    setCurrentReps('');
    setCurrentWeight('');
  }, []);

  const moveToNextExercise = useCallback(() => {
    // Calcular o índice do próximo exercício
    const nextExerciseIndex = currentExerciseIndex + 1;
    
    // Mover para o próximo exercício
    setCurrentExerciseIndex(nextExerciseIndex);
    setCurrentSetIndex(0);
    setCurrentReps('');
    setCurrentWeight('');
  }, [currentExerciseIndex]);

  // Novo método para pular para um exercício específico
  const jumpToExercise = useCallback((index: number) => {
    if (index < 0 || index >= workoutExercises.length) {
      console.error('Índice de exercício inválido:', index);
      return;
    }

    // Atualizar o índice do exercício atual
    setCurrentExerciseIndex(index);
    
    // Verificar o estado do log para determinar em qual set começar
    const exerciseId = workoutExercises[index].exercise_id;
    const exerciseLogs = sessionStateRef.current.exerciseLogs[exerciseId];
    
    if (exerciseLogs) {
      // Encontrar o primeiro set não completado
      const incompleteSetIndex = exerciseLogs.findIndex(log => !log.completed && !log.skipped);
      
      if (incompleteSetIndex >= 0) {
        setCurrentSetIndex(incompleteSetIndex);
      } else {
        // Se todos os sets estiverem completados, iniciar do primeiro
        setCurrentSetIndex(0);
      }
    } else {
      // Se não houver logs, iniciar do primeiro set
      setCurrentSetIndex(0);
    }
    
    // Resetar valores atuais
    setCurrentReps('');
    setCurrentWeight('');
    
    toast.info(`Pulando para: ${workoutExercises[index].exercise.name}`);
  }, [workoutExercises]);
  
  const finishWorkout = async () => {
    if (!user || !sessionId || !workout) return;
    
    try {
      // Calculate total duration in minutes (current time - start time)
      const startTimeStr = localStorage.getItem('sessionStartTime');
      const startTime = startTimeStr ? new Date(startTimeStr) : new Date();
      const endTime = new Date();
      const durationMinutes = Math.round((endTime.getTime() - startTime.getTime()) / 60000);
      
      // Update session in database
      const { error } = await supabase
        .from('treino_4aivzd_workout_sessions')
        .update({
          status: SessionStatus.Completed,
          completed_at: endTime.toISOString(),
          duration_minutes: durationMinutes,
          notes: sessionNotes,
          perceived_effort: perceivedEffort,
        })
        .eq('id', sessionId);
      
      if (error) throw error;
      
      // Save exercise logs
      const allLogs: ExerciseLogData[] = [];
      for (const [exerciseId, logs] of Object.entries(exerciseLogs)) {
        for (const log of logs) {
          if (log.completed || log.skipped) {
            allLogs.push({
              workout_session_id: sessionId,
              exercise_id: exerciseId,
              set_number: log.set_number,
              reps_completed: log.reps_completed,
              weight_kg: log.weight_kg,
              completed_at: log.completed_at,
              was_skipped: log.skipped,
            });
          }
        }
      }
      
      if (allLogs.length > 0) {
        const { error: logsError } = await supabase
          .from('treino_4aivzd_exercise_logs')
          .insert(allLogs);
        
        if (logsError) {
          console.error('Error saving exercise logs:', logsError);
          toast.error('Alguns detalhes do treino não puderam ser salvos');
        }
      }
      
      // Clear local storage
      localStorage.removeItem('activeWorkoutSession');
      localStorage.removeItem('sessionStartTime');
      
      toast.success('Treino concluído com sucesso!');
      return;
    } catch (error) {
      console.error('Error finishing workout:', error);
      toast.error('Erro ao finalizar o treino');
      throw error;
    }
  };
  
  const loadWorkoutDetails = async () => {
    if (!user || !workoutId) return;
    
    setIsLoading(true);
    try {
      // Load workout information
      const { data: workoutData, error: workoutError } = await supabase
        .from('treino_4aivzd_workouts')
        .select('*')
        .eq('id', workoutId)
        .single();

      if (workoutError) throw new Error(workoutError.message);
      
      setWorkout(workoutData);

      // Load workout exercises
      const { data: exercisesData, error: exercisesError } = await supabase
        .from('treino_4aivzd_workout_exercises')
        .select(`
          *,
          exercise:exercise_id (*)
        `)
        .eq('workout_id', workoutId)
        .order('order_position', { ascending: true });

      if (exercisesError) throw new Error(exercisesError.message);

      if (!exercisesData || exercisesData.length === 0) {
        toast.error('Este treino não possui exercícios');
        
        // Em vez de lançar um erro, simplesmente definir isLoading como false
        // e retornar da função
        setIsLoading(false);
        
        // Vamos deixar o componente pai lidar com o redirecionamento
        return;
      }

      setWorkoutExercises(exercisesData);
      
      // Initialize exercise logs
      const logsObj: Record<string, any[]> = {};
      exercisesData.forEach(ex => {
        logsObj[ex.exercise_id] = Array(ex.sets).fill(null).map((_, idx) => ({
          set_number: idx + 1,
          completed: false,
          skipped: false,
        }));
      });
      setExerciseLogs(logsObj);
      
      // Verificar possíveis sessões em andamento e fazer limpeza primeiro
      // Isso agora retorna a sessão mais recente, se existir
      const existingSession = await cleanupDuplicateSessions(workoutId, user.id);
      
      if (existingSession) {
        // Se existe uma sessão em andamento, usar ela
        console.log('Retomando sessão em andamento:', existingSession.id);
        setSessionId(existingSession.id);
        
        // Buscar logs se existirem
        const { data: sessionLogs, error: logsError } = await supabase
          .from('treino_4aivzd_exercise_logs')
          .select('*')
          .eq('workout_session_id', existingSession.id)
          .order('completed_at', { ascending: true });
        
        if (logsError) {
          console.error('Erro ao carregar logs da sessão:', logsError);
        }
        
        // Se tiver logs, processar os dados
        if (sessionLogs && sessionLogs.length > 0) {
          // Processar logs existentes para determinar o progresso
          let maxExerciseIndex = 0;
          let maxSetIndex = 0;
          
          // Organizing logs by exercise
          const exerciseLogsMap: Record<string, any[]> = {...logsObj};
          
          sessionLogs.forEach(log => {
            const exIndex = exercisesData.findIndex(ex => ex.exercise_id === log.exercise_id);
            if (exIndex > maxExerciseIndex) {
              maxExerciseIndex = exIndex;
            }
            
            // Update the exercise log
            if (exerciseLogsMap[log.exercise_id] && log.set_number <= exerciseLogsMap[log.exercise_id].length) {
              exerciseLogsMap[log.exercise_id][log.set_number - 1] = {
                set_number: log.set_number,
                completed: !log.was_skipped,
                skipped: log.was_skipped,
                reps_completed: log.reps_completed,
                weight_kg: log.weight_kg,
                completed_at: log.completed_at
              };
              
              if (exIndex === maxExerciseIndex && log.set_number > maxSetIndex) {
                maxSetIndex = log.set_number;
              }
            }
          });
          
          // Update state
          setExerciseLogs(exerciseLogsMap);
          setCurrentExerciseIndex(maxExerciseIndex);
          setCurrentSetIndex(maxSetIndex >= exercisesData[maxExerciseIndex].sets ? 0 : maxSetIndex);
        }
        
        // Salvar no localStorage para consistência
        const completeSessionData: WorkoutSessionData = {
          id: existingSession.id,
          workout_id: workoutId,
          user_id: user.id,
          status: SessionStatus.InProgress,
          started_at: existingSession.started_at,
          current_exercise_index: currentExerciseIndex,
          current_set_index: currentSetIndex,
          exercise_logs: []
        };
        saveSessionToLocalStorage(completeSessionData);
        
        // Se não for a última série do último exercício, considerar como um treino em andamento
        const isLastExercise = currentExerciseIndex === exercisesData.length - 1;
        const isLastSet = currentSetIndex === exercisesData[currentExerciseIndex].sets - 1;
        
        if (isLastExercise && isLastSet) {
          // Se estiver na última série do último exercício, perguntar se deseja concluir
          toast.info('Você estava na última parte do treino. Conclua quando terminar.');
        } else if (!shownToastSessionIds.has(existingSession.id)) {
          // Mostrar mensagem apenas se não tiver sido mostrada antes nesta sessão do navegador
          toast.success('Sessão de treino retomada!');
          // Adicionar ao conjunto de sessões já notificadas
          shownToastSessionIds.add(existingSession.id);
        }
      } else {
        // Verificar se já existe uma sessão no localStorage
        const savedSession = localStorage.getItem('activeWorkoutSession');
        if (savedSession) {
          try {
            const sessionData = JSON.parse(savedSession) as WorkoutSessionData;
            if (sessionData.workout_id === workoutId) {
              // Recuperar a sessão do localStorage em vez de criar uma nova
              console.log('Recuperando sessão do localStorage:', sessionData.id);
              setSessionId(sessionData.id);
              
              // Atualizar no banco de dados para garantir que existe
              const { error } = await supabase
                .from('treino_4aivzd_workout_sessions')
                .upsert({
                  id: sessionData.id,
                  workout_id: workoutId,
                  user_id: user.id,
                  status: SessionStatus.InProgress,
                  started_at: sessionData.started_at || new Date().toISOString(),
                });
              
              if (error) {
                console.error('Erro ao restaurar sessão do localStorage:', error);
                // Se falhar, criar uma nova
                await createWorkoutSession(workoutData.id);
              } else {
                // Verificar se há uma hora de início salva
                if (!localStorage.getItem('sessionStartTime')) {
                  localStorage.setItem('sessionStartTime', new Date().toISOString());
                }
                
                if (!shownRecoverySessionIds.has(sessionData.id)) {
                  toast.success('Sessão de treino recuperada!');
                  shownRecoverySessionIds.add(sessionData.id);
                }
                return;
              }
            }
          } catch (e) {
            console.error('Erro ao analisar sessão salva:', e);
          }
        }
        
        // Criar uma nova sessão se nenhuma foi encontrada
        await createWorkoutSession(workoutData.id);
      }
    } catch (error) {
      console.error('Error loading workout details:', error);
      toast.error('Erro ao carregar o treino');
    } finally {
      setIsLoading(false);
    }
  };
  
  // Load workout details on mount
  useEffect(() => {
    if (workoutId) {
      loadWorkoutDetails();
    }
    
    // Cleanup
    return () => {
      // Cleanup code if needed
    };
  }, [workoutId, user]);
  
  return {
    workout,
    workoutExercises,
    isLoading,
    sessionId,
    currentExerciseIndex,
    currentSetIndex,
    exerciseLogs,
    currentExercise,
    currentLog,
    isLastExercise,
    isLastSet,
    currentReps,
    currentWeight,
    setCurrentReps,
    setCurrentWeight,
    completeSet,
    skipSet,
    moveToNextSet,
    moveToNextExercise,
    jumpToExercise,
    showCompletionDialog,
    setShowCompletionDialog,
    sessionNotes,
    setSessionNotes,
    perceivedEffort,
    setPerceivedEffort,
    finishWorkout,
    loadWorkoutDetails
  };
} 