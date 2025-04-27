import React, { useState, useCallback, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import PageLayout from '../components/layout/PageLayout';
import { useWorkoutSession } from '../hooks/useWorkoutSession';
import { useExerciseTimer } from '../hooks/useExerciseTimer';
import { RestTimer } from '../components/workout/RestTimer';
import { ExerciseCard } from '../components/workout/ExerciseCard';
import { NextExercisesCard } from '../components/workout/NextExercisesCard';
import { WorkoutProgress } from '../components/workout/WorkoutProgress';
import { CompletionDialog } from '../components/workout/CompletionDialog';
import { WorkoutHeader } from '../components/workout/WorkoutHeader';
import { ExerciseTrackingType } from '../types';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';

const WorkoutTrainPage: React.FC = () => {
  const { workoutId } = useParams<{ workoutId: string }>();
  const navigate = useNavigate();
  
  // Estado para controlar se o exercício baseado em tempo está sendo executado
  const [isExercising, setIsExercising] = useState(false);
  const [shouldCompleteSet, setShouldCompleteSet] = useState(false);
  
  // Hooks customizados
  const timer = useExerciseTimer();
  const session = useWorkoutSession(workoutId);
  
  const { 
    workout, 
    workoutExercises, 
    isLoading, 
    currentExerciseIndex, 
    currentSetIndex,
    currentExercise,
    currentReps,
    currentWeight,
    setCurrentReps,
    setCurrentWeight,
    completeSet,
    skipSet,
    moveToNextExercise,
    jumpToExercise,
    showCompletionDialog,
    setShowCompletionDialog,
    sessionNotes,
    setSessionNotes,
    perceivedEffort,
    setPerceivedEffort,
    finishWorkout,
    exerciseLogs
  } = session;
  
  // Efeito para redirecionar quando não há exercícios
  useEffect(() => {
    if (!isLoading && workout && workoutExercises.length === 0) {
      toast.error('Adicione exercícios ao treino para iniciar o treinamento');
      navigate(`/workouts/${workoutId}/edit`);
    }
  }, [isLoading, workout, workoutExercises, workoutId, navigate]);
  
  const {
    isResting,
    timeRemaining,
    startTimer
  } = timer;

  // Verificar se um exercício está completo (todas as séries concluídas)
  const isExerciseCompleted = useCallback((exerciseId: string): boolean => {
    const logs = exerciseLogs[exerciseId];
    if (!logs) return false;
    
    // Um exercício só é considerado completo se todas as suas séries foram concluídas (não apenas puladas)
    return logs.every(log => log.completed === true);
  }, [exerciseLogs]);
  
  // Verificar exercícios não concluídos
  const getIncompleteExercises = useCallback(() => {
    return workoutExercises.filter(ex => !isExerciseCompleted(ex.exercise_id));
  }, [workoutExercises, isExerciseCompleted]);

  // Handler para selecionar um exercício específico
  const handleSelectExercise = useCallback((index: number) => {
    // Se estiver em descanso, confirmar com o usuário
    if (isResting) {
      const confirmChange = window.confirm(
        'Você está no período de descanso. Deseja realmente pular para outro exercício?'
      );
      if (!confirmChange) return;
    }
    
    // Se estiver fazendo um exercício baseado em tempo, confirmar com o usuário
    if (isExercising) {
      const confirmChange = window.confirm(
        'Você está no meio de um exercício. Deseja realmente pular para outro exercício?'
      );
      if (!confirmChange) return;
      setIsExercising(false);
    }
    
    // Pular para o exercício selecionado
    jumpToExercise(index);
  }, [isResting, isExercising, jumpToExercise]);
  
  // Handler para iniciar um exercício baseado em tempo
  const handleStartExercise = useCallback(() => {
    if (currentExercise?.tracking_type === ExerciseTrackingType.Time) {
      setIsExercising(true);
    }
  }, [currentExercise]);
  
  // Handler para quando o timer do exercício completar
  const handleExerciseTimerComplete = useCallback(() => {
    setIsExercising(false);
    // Marcar que devemos completar o set, mas não chamar diretamente
    setShouldCompleteSet(true);
  }, []);
  
  // Efeito para lidar com a conclusão do set após o timer ter completado
  useEffect(() => {
    if (shouldCompleteSet) {
      handleCompleteSet();
      setShouldCompleteSet(false);
    }
  }, [shouldCompleteSet]);
  
  // Handler para completar série
  const handleCompleteSet = useCallback(() => {
    // Se o exercício for baseado em tempo e não tiver sido iniciado/completado, não permitir completar
    if (currentExercise?.tracking_type === ExerciseTrackingType.Time && !isExercising && !shouldCompleteSet) {
      return;
    }
    
    // Para exercícios não baseados em tempo, verificar se as repetições foram informadas
    if (currentExercise?.tracking_type !== ExerciseTrackingType.Time && currentReps === '') {
      toast.error('Informe o número de repetições realizadas');
      return;
    }
    
    completeSet({ reps: currentReps === '' ? undefined : currentReps, weight: currentWeight === '' ? undefined : currentWeight });
    
    // Iniciar o timer de descanso após completar uma série
    if (currentExercise?.rest_after_sec && currentExercise.rest_after_sec > 0) {
      startTimer(currentExercise.rest_after_sec);
    }
    
    // Resetar o estado de exercício
    setIsExercising(false);
  }, [currentExercise, isExercising, shouldCompleteSet, completeSet, currentReps, currentWeight, startTimer]);
  
  // Handler para finalizar o treino após confirmação
  const handleFinishWorkout = useCallback(async () => {
    // Verificar se há exercícios incompletos
    const incompleteExercises = getIncompleteExercises();
    
    if (incompleteExercises.length > 0) {
      // Preparar a mensagem de alerta
      const exerciseNames = incompleteExercises
        .map(ex => ex.exercise.name)
        .join(', ');
      
      const confirmMessage = `Os seguintes exercícios não foram concluídos: ${exerciseNames}. 
      
Deseja finalizar o treino mesmo assim?`;
      
      const userConfirmed = window.confirm(confirmMessage);
      
      if (!userConfirmed) {
        // Se o usuário não confirmar, não finalizar o treino
        return;
      }
    }
    
    // Se não houver exercícios incompletos ou o usuário confirmar, prosseguir com a finalização
    await finishWorkout();
    navigate('/dashboard');
  }, [finishWorkout, navigate, getIncompleteExercises]);

  // Handler para exibir o diálogo de finalização
  const handleShowCompletionDialog = useCallback(() => {
    // Verificar se há exercícios incompletos
    const incompleteExercises = getIncompleteExercises();
    
    if (incompleteExercises.length > 0) {
      // Mostrar Toast de aviso sobre exercícios incompletos
      toast.warning(`Há ${incompleteExercises.length} exercícios não concluídos. Você poderá confirmar esta ação na próxima tela.`);
    }
    
    // Abrir o diálogo de finalização
    setShowCompletionDialog(true);
  }, [getIncompleteExercises, setShowCompletionDialog]);
  
  // Loading state
  if (isLoading) {
    return (
      <PageLayout>
        <div className="container py-8">
          <div className="flex justify-center items-center h-40">
            <p>Preparando seu treino...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  // No workout found
  if (!workout || !currentExercise) {
    return (
      <PageLayout>
        <div className="container py-8">
          <div className="text-center">
            <h2 className="text-xl font-bold">Treino não encontrado</h2>
            <Button 
              variant="default"
              className="mt-4"
              onClick={() => navigate('/workouts')}
            >
              Voltar para treinos
            </Button>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-8">
        {/* Workout Header */}
        <WorkoutHeader workout={workout} />

        {/* Progress Bars */}
        <WorkoutProgress 
          workoutExercises={workoutExercises}
          currentExerciseIndex={currentExerciseIndex}
          currentSetIndex={currentSetIndex}
          currentExercise={currentExercise}
        />

        {/* Rest Timer */}
        {!isExercising && <RestTimer timer={timer} />}

        {/* Current Exercise Card */}
        <ExerciseCard
          exercise={currentExercise}
          currentSetIndex={currentSetIndex}
          currentReps={currentReps}
          currentWeight={currentWeight}
          isResting={isResting}
          isExercising={isExercising}
          timeRemaining={timeRemaining}
          onRepsChange={setCurrentReps}
          onWeightChange={setCurrentWeight}
          onCompleteSet={handleCompleteSet}
          onSkipSet={skipSet}
          onStartExercise={handleStartExercise}
          onExerciseTimerComplete={handleExerciseTimerComplete}
        />

        {/* Next Exercises Card - agora inclui todos os exercícios e permite selecioná-los */}
        <NextExercisesCard 
          exercises={workoutExercises} 
          currentExerciseIndex={currentExerciseIndex}
          onSelectExercise={handleSelectExercise}
          exerciseLogs={exerciseLogs}
        />
        
        {/* Botão para finalizar treino */}
        <div className="mt-8 flex justify-center">
          <Button
            variant="default"
            size="lg"
            onClick={handleShowCompletionDialog}
          >
            Finalizar Treino
          </Button>
        </div>
      </div>

      {/* Finish Workout Dialog */}
      <CompletionDialog
        open={showCompletionDialog}
        onOpenChange={setShowCompletionDialog}
        sessionNotes={sessionNotes}
        setSessionNotes={setSessionNotes}
        perceivedEffort={perceivedEffort}
        setPerceivedEffort={setPerceivedEffort}
        onFinish={handleFinishWorkout}
      />
    </PageLayout>
  );
};

export default WorkoutTrainPage; 