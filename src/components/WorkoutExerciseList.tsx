import React, { useState } from 'react';
import { WorkoutExercise, Exercise } from '../types';
import { Button } from './ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "./ui/table";
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { toast } from 'sonner';
import { Edit, Trash, ChevronUp, ChevronDown } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "./ui/alert-dialog";

interface WorkoutExerciseListProps {
  exercises: (WorkoutExercise & { exercise: Exercise })[];
  onRemove: (exerciseId: string, orderPosition: number) => Promise<void>;
  onReorder: (exerciseId: string, currentPosition: number, newPosition: number) => Promise<void>;
  onEditExercise: (exercise: WorkoutExercise) => void;
}

const WorkoutExerciseList: React.FC<WorkoutExerciseListProps> = ({
  exercises,
  onRemove,
  onReorder,
  onEditExercise
}) => {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleMoveUp = async (exercise: WorkoutExercise & { exercise: Exercise }) => {
    if (isProcessing || exercise.order_position <= 1) return;
    
    setIsProcessing(true);
    try {
      await onReorder(
        exercise.exercise_id,
        exercise.order_position,
        exercise.order_position - 1
      );
    } catch (error) {
      console.error('Erro ao reordenar exercício:', error);
      toast.error('Erro ao mover exercício');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoveDown = async (exercise: WorkoutExercise & { exercise: Exercise }) => {
    if (isProcessing || exercise.order_position >= exercises.length) return;
    
    setIsProcessing(true);
    try {
      await onReorder(
        exercise.exercise_id,
        exercise.order_position,
        exercise.order_position + 1
      );
    } catch (error) {
      console.error('Erro ao reordenar exercício:', error);
      toast.error('Erro ao mover exercício');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemove = async (exercise: WorkoutExercise & { exercise: Exercise }) => {
    setIsProcessing(true);
    try {
      await onRemove(exercise.exercise_id, exercise.order_position);
    } catch (error) {
      console.error('Erro ao remover exercício:', error);
      toast.error('Erro ao remover exercício');
    } finally {
      setIsProcessing(false);
    }
  };

  if (exercises.length === 0) {
    return (
      <div className="text-center py-10 border rounded-md bg-muted/20">
        <p className="text-muted-foreground">Nenhum exercício adicionado ao treino</p>
        <p className="text-sm text-muted-foreground mt-1">
          Use o botão "Adicionar Exercício" para começar a montar seu treino
        </p>
      </div>
    );
  }

  return (
    <div className="border rounded-md overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-12 text-center">#</TableHead>
            <TableHead>Exercício</TableHead>
            <TableHead className="w-16 text-center">Séries</TableHead>
            <TableHead className="w-16 text-center">Reps</TableHead>
            <TableHead className="w-20 text-center">Descanso</TableHead>
            <TableHead className="w-32 text-center">Ações</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {exercises.map((exercise) => (
            <TableRow key={`${exercise.exercise_id}-${exercise.order_position}`}>
              <TableCell className="text-center font-medium">
                {exercise.order_position}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium">{exercise.exercise.name}</div>
                  {exercise.notes && (
                    <div className="text-xs text-muted-foreground mt-1 line-clamp-2">
                      {exercise.notes}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-center">{exercise.sets}</TableCell>
              <TableCell className="text-center">{exercise.reps_per_set || '-'}</TableCell>
              <TableCell className="text-center">{exercise.rest_after_sec || 60}s</TableCell>
              <TableCell>
                <div className="flex justify-center space-x-1">
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={exercise.order_position <= 1 || isProcessing}
                    onClick={() => handleMoveUp(exercise)}
                  >
                    <ChevronUp className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    disabled={exercise.order_position >= exercises.length || isProcessing}
                    onClick={() => handleMoveDown(exercise)}
                  >
                    <ChevronDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => onEditExercise(exercise)}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <AlertDialog>
                    <AlertDialogTrigger asChild>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash className="h-4 w-4" />
                      </Button>
                    </AlertDialogTrigger>
                    <AlertDialogContent>
                      <AlertDialogHeader>
                        <AlertDialogTitle>Remover exercício</AlertDialogTitle>
                        <AlertDialogDescription>
                          Tem certeza que deseja remover "{exercise.exercise.name}" do treino?
                          Esta ação não pode ser desfeita.
                        </AlertDialogDescription>
                      </AlertDialogHeader>
                      <AlertDialogFooter>
                        <AlertDialogCancel>Cancelar</AlertDialogCancel>
                        <AlertDialogAction 
                          className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
                          onClick={() => handleRemove(exercise)}
                          disabled={isProcessing}
                        >
                          Remover
                        </AlertDialogAction>
                      </AlertDialogFooter>
                    </AlertDialogContent>
                  </AlertDialog>
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
};

export default WorkoutExerciseList; 