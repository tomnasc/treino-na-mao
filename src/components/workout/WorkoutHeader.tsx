import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../ui/button';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from "../ui/alert-dialog";
import { ArrowLeft } from 'lucide-react';
import { Workout } from '../../types';
import { useWorkoutSession } from "../../hooks/useWorkoutSession";
import supabase from '../../lib/supabase';
import { toast } from 'sonner';

interface WorkoutHeaderProps {
  workout: Workout;
}

export const WorkoutHeader: React.FC<WorkoutHeaderProps> = ({ workout }) => {
  const navigate = useNavigate();
  const { sessionId } = useWorkoutSession(workout.id);
  
  // Função para abandonar o treino
  const handleAbandonWorkout = async () => {
    if (!sessionId) return;
    
    try {
      // Atualizar o status da sessão no banco de dados
      const { error } = await supabase
        .from('treino_4aivzd_workout_sessions')
        .update({
          status: 'abandoned',
          completed_at: new Date().toISOString()
        })
        .eq('id', sessionId);
      
      if (error) {
        console.error('Erro ao abandonar sessão:', error);
        toast.error('Erro ao abandonar o treino');
      } else {
        // Limpar dados da sessão no localStorage
        localStorage.removeItem('activeWorkoutSession');
        localStorage.removeItem('sessionStartTime');
        
        // Redirecionar
        navigate('/workouts');
      }
    } catch (error) {
      console.error('Erro ao abandonar treino:', error);
    }
  };
  
  return (
    <div className="flex items-center mb-6">
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="outline" size="icon" className="mr-4">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </AlertDialogTrigger>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Abandonar o treino?</AlertDialogTitle>
            <AlertDialogDescription>
              Seu progresso será perdido. Tem certeza que deseja sair?
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Continuar Treino</AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleAbandonWorkout}
              className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500"
            >
              Abandonar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      
      <div>
        <h1 className="text-2xl font-bold">{workout.title}</h1>
        <p className="text-muted-foreground">Sessão de treino em andamento</p>
      </div>
    </div>
  );
}; 