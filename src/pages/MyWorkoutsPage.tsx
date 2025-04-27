import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/supabase';
import { Workout } from '../types';
import PageLayout from '../components/layout/PageLayout';
import { Button } from '../components/ui/button';

const MyWorkoutsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Carregar treinos do usuário
  useEffect(() => {
    const loadWorkouts = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        const { data, error } = await supabase
          .from('treino_4aivzd_workouts')
          .select('*')
          .eq('user_id', user.id)
          .order('order', { ascending: true }) // Ordenação primária pela coluna order
          .order('created_at', { ascending: false }); // Ordenação secundária pela data de criação

        if (error) {
          throw new Error(error.message);
        }

        setWorkouts(data || []);
      } catch (error) {
        console.error('Erro ao carregar treinos:', error);
        toast.error('Erro ao carregar seus treinos');
      } finally {
        setIsLoading(false);
      }
    };

    loadWorkouts();
  }, [user]);

  // Formatar data para exibição
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  return (
    <PageLayout>
      <div className="container px-4 py-8">
        <div className="mb-6">
          <h1 className="text-2xl font-bold mb-1">Meus Treinos</h1>
          <p className="text-muted-foreground">Treinos que você criou ou salvou</p>
        </div>

        {isLoading ? (
          <div className="flex justify-center items-center h-40">
            <p>Carregando treinos...</p>
          </div>
        ) : workouts.length === 0 ? (
          <div className="text-center py-12 border rounded-lg">
            <h3 className="text-lg font-medium">Sem treinos encontrados</h3>
            <p className="mt-2 text-muted-foreground">
              Você ainda não criou nenhum treino
            </p>
            <Button 
              className="mt-6"
              onClick={() => navigate('/workouts/new')}
            >
              Criar Treino
            </Button>
          </div>
        ) : (
          <div className="space-y-4">
            {workouts.map((workout) => (
              <div key={workout.id} className="border rounded-lg overflow-hidden">
                <div className="p-4">
                  <h3 className="font-medium text-lg">{workout.title}</h3>
                  <p className="text-sm text-muted-foreground mt-1">
                    Criado em {formatDate(workout.created_at)}
                  </p>
                </div>
                <div className="bg-muted p-3 flex justify-end border-t">
                  <Button 
                    variant="outline" 
                    size="sm"
                    className="mr-2"
                    onClick={() => navigate(`/workouts/${workout.id}/edit`)}
                  >
                    Editar
                  </Button>
                  <Button 
                    size="sm"
                    onClick={() => navigate(`/workouts/${workout.id}/train`)}
                  >
                    Treinar
                  </Button>
                </div>
              </div>
            ))}

            <div className="mt-6 text-center">
              <Button 
                variant="outline"
                onClick={() => navigate('/workouts')}
                className="w-full"
              >
                Ver Todos os Treinos
              </Button>
            </div>
          </div>
        )}
      </div>
    </PageLayout>
  );
};

export default MyWorkoutsPage; 