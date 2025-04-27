import React from 'react';
import { Progress } from '../ui/progress';
import { Exercise, WorkoutExercise } from '../../types';

interface WorkoutProgressProps {
  workoutExercises: (WorkoutExercise & { exercise: Exercise })[];
  currentExerciseIndex: number;
  currentSetIndex: number;
  currentExercise?: WorkoutExercise & { exercise: Exercise };
}

export const WorkoutProgress: React.FC<WorkoutProgressProps> = ({
  workoutExercises,
  currentExerciseIndex,
  currentSetIndex,
  currentExercise
}) => {
  const getExerciseProgress = (): number => {
    if (!workoutExercises.length) return 0;
    return ((currentExerciseIndex / workoutExercises.length) * 100);
  };

  const getSetProgress = (): number => {
    if (!currentExercise) return 0;
    return ((currentSetIndex / currentExercise.sets) * 100);
  };

  return (
    <div className="space-y-2 mb-6">
      <div className="flex justify-between text-sm mb-1">
        <span>Progresso do Treino</span>
        <span>{currentExerciseIndex + 1}/{workoutExercises.length} exercícios</span>
      </div>
      <Progress value={getExerciseProgress()} className="h-2" />
      
      {currentExercise && (
        <>
          <div className="flex justify-between text-sm mb-1 mt-3">
            <span>Séries do Exercício Atual</span>
            <span>{currentSetIndex + 1}/{currentExercise.sets} séries</span>
          </div>
          <Progress value={getSetProgress()} className="h-2" />
        </>
      )}
    </div>
  );
};
