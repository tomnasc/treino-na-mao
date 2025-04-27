import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { Exercise, WorkoutExercise, ExerciseTrackingType } from '../../types';

interface NextExercisesCardProps {
  exercises: (WorkoutExercise & { exercise: Exercise })[];
  currentExerciseIndex: number;
  onSelectExercise: (index: number) => void;
  exerciseLogs: Record<string, any[]>;
}

export const NextExercisesCard: React.FC<NextExercisesCardProps> = ({ 
  exercises, 
  currentExerciseIndex,
  onSelectExercise,
  exerciseLogs
}) => {
  // Mostrar todos os exercícios, excluindo o atual
  const otherExercises = exercises.filter((_, index) => index !== currentExerciseIndex);
  
  if (otherExercises.length === 0) {
    return null;
  }

  // Verificar se um exercício está completo (todas as séries concluídas)
  const isExerciseCompleted = (exerciseId: string): boolean => {
    const logs = exerciseLogs[exerciseId];
    if (!logs) return false;
    
    // Um exercício só é considerado completo se todas as suas séries foram concluídas (não apenas puladas)
    return logs.every(log => log.completed === true);
  };
  
  const handleSelectExercise = (index: number) => {
    onSelectExercise(index);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Exercícios do Treino</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {otherExercises.map((ex) => {
            // Encontrar o índice real no array original de exercícios
            const originalIndex = exercises.findIndex(e => e.exercise_id === ex.exercise_id);
            const isCompleted = isExerciseCompleted(ex.exercise_id);
            
            return (
              <Button
                key={`${ex.exercise_id}-${ex.order_position}`}
                variant="ghost"
                className="w-full justify-between px-3 py-2 h-auto"
                onClick={() => handleSelectExercise(originalIndex)}
              >
                <div className="flex flex-col items-start">
                  <p className="font-medium text-left">{ex.exercise.name}</p>
                  <p className="text-sm text-muted-foreground text-left">
                    {ex.sets} séries x {' '}
                    {ex.tracking_type === ExerciseTrackingType.Time 
                      ? `${ex.duration_sec || '?'} segundos` 
                      : `${ex.reps_per_set || '?'} repetições (${ex.weight_kg || '?'} kg)`}
                  </p>
                </div>
                <div className="flex items-center">
                  {isCompleted ? 
                    <Badge variant="secondary" className="bg-green-700 dark:bg-green-600 text-white">Concluído</Badge> : 
                    <Badge variant="outline">{originalIndex - currentExerciseIndex}</Badge>
                  }
                </div>
              </Button>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
}; 