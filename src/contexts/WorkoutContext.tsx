import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Workout, WorkoutExercise, Exercise } from '../types';
import { WorkoutService } from '../lib/services';
import { useAuth } from './AuthContext';
import { toast } from 'sonner';

interface WorkoutContextType {
  workouts: Workout[];
  loading: boolean;
  error: string | null;
  currentWorkout: (Workout & { exercises: (WorkoutExercise & { exercise: Exercise })[] }) | null;
  fetchWorkouts: () => Promise<void>;
  fetchWorkoutDetails: (id: string) => Promise<void>;
  createWorkout: (workoutData: any) => Promise<Workout | null>;
  updateWorkout: (id: string, workoutData: any) => Promise<Workout | null>;
  deleteWorkout: (id: string) => Promise<boolean>;
  clearCurrentWorkout: () => void;
}

const WorkoutContext = createContext<WorkoutContextType | undefined>(undefined);

export function WorkoutProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [currentWorkout, setCurrentWorkout] = useState<(Workout & { exercises: (WorkoutExercise & { exercise: Exercise })[] }) | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Carregar treinos quando o usuário estiver autenticado
  useEffect(() => {
    if (user) {
      fetchWorkouts();
    } else {
      setWorkouts([]);
      setCurrentWorkout(null);
    }
  }, [user]);

  // Buscar todos os treinos do usuário
  const fetchWorkouts = async () => {
    if (!user) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await WorkoutService.getWorkouts(user.id);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      setWorkouts(response.workouts);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar treinos';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao carregar treinos:', err);
    } finally {
      setLoading(false);
    }
  };

  // Buscar detalhes de um treino específico
  const fetchWorkoutDetails = async (id: string) => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await WorkoutService.getWorkoutById(id);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.workout || !response.exercises) {
        throw new Error('Treino não encontrado');
      }
      
      // Transformar os dados recebidos para o formato esperado pelo estado
      setCurrentWorkout({
        ...response.workout,
        exercises: response.exercises
      });
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao carregar detalhes do treino';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao carregar detalhes do treino:', err);
    } finally {
      setLoading(false);
    }
  };

  // Criar um novo treino
  const createWorkout = async (workoutData: any): Promise<Workout | null> => {
    if (!user) return null;
    
    setLoading(true);
    setError(null);
    
    try {
      const response = await WorkoutService.createWorkout(user.id, workoutData);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.workout) {
        throw new Error('Erro ao criar treino');
      }
      
      // Adicionar o novo treino à lista
      setWorkouts(prevWorkouts => [response.workout!, ...prevWorkouts]);
      
      toast.success('Treino criado com sucesso!');
      return response.workout;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao criar treino';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao criar treino:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Atualizar um treino existente
  const updateWorkout = async (id: string, workoutData: any): Promise<Workout | null> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await WorkoutService.updateWorkout(id, workoutData);
      
      if (response.error) {
        throw new Error(response.error);
      }
      
      if (!response.workout) {
        throw new Error('Erro ao atualizar treino');
      }
      
      // Atualizar o treino na lista
      setWorkouts(prevWorkouts => 
        prevWorkouts.map(w => w.id === id ? response.workout! : w)
      );
      
      // Atualizar o treino atual se for o mesmo
      if (currentWorkout && currentWorkout.id === id) {
        await fetchWorkoutDetails(id);
      }
      
      toast.success('Treino atualizado com sucesso!');
      return response.workout;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao atualizar treino';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao atualizar treino:', err);
      return null;
    } finally {
      setLoading(false);
    }
  };

  // Deletar um treino
  const deleteWorkout = async (id: string): Promise<boolean> => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await WorkoutService.deleteWorkout(id);
      
      if (!response.success) {
        throw new Error(response.error || 'Erro ao excluir treino');
      }
      
      // Remover o treino da lista
      setWorkouts(prevWorkouts => 
        prevWorkouts.filter(w => w.id !== id)
      );
      
      // Limpar o treino atual se for o mesmo
      if (currentWorkout && currentWorkout.id === id) {
        setCurrentWorkout(null);
      }
      
      toast.success('Treino excluído com sucesso!');
      return true;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Erro ao excluir treino';
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Erro ao excluir treino:', err);
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Limpar o treino atual
  const clearCurrentWorkout = () => {
    setCurrentWorkout(null);
  };

  const value = {
    workouts,
    loading,
    error,
    currentWorkout,
    fetchWorkouts,
    fetchWorkoutDetails,
    createWorkout,
    updateWorkout,
    deleteWorkout,
    clearCurrentWorkout
  };

  return <WorkoutContext.Provider value={value}>{children}</WorkoutContext.Provider>;
}

export function useWorkout() {
  const context = useContext(WorkoutContext);
  
  if (context === undefined) {
    throw new Error('useWorkout deve ser usado dentro de um WorkoutProvider');
  }
  
  return context;
} 