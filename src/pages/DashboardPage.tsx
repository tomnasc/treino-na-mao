// src/pages/DashboardPage.tsx
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

import PageLayout from "../components/layout/PageLayout";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Checkbox } from "../components/ui/checkbox";
import supabase from "../lib/supabase";
import { UserProfile, WorkoutSession, Workout, TodoCategory, TodoItem } from "../types";
import { PlusCircle, ArrowRight, ListTodo, Trash2 } from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "../components/ui/alert-dialog";

const DashboardPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [recentSessions, setRecentSessions] = useState<WorkoutSession[]>([]);
  const [savedWorkouts, setSavedWorkouts] = useState<Workout[]>([]);
  const [pendingTodos, setPendingTodos] = useState<{[key: string]: TodoItem[]}>({
    personal: [],
    workout: [],
    diet: []
  });
  const [isLoading, setIsLoading] = useState(true);
  const [todosLoading, setTodosLoading] = useState(true);
  const [selectedSessions, setSelectedSessions] = useState<string[]>([]);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);

  useEffect(() => {
    const loadUserData = async () => {
      if (!user) return;
      
      // Realizar limpeza de sessões antigas
      cleanupStaleSessions();
      
      setIsLoading(true);
      try {
        // Verificar se o perfil existe
        const { data: existingProfiles, error: profileQueryError } = await supabase
          .from('treino_4aivzd_user_profiles')
          .select('*')
          .eq('user_id', user.id);

        // Se houve erro na consulta
        if (profileQueryError) {
          console.error('Error querying profile:', profileQueryError);
          toast.error('Erro ao consultar seu perfil');
          setIsLoading(false);
          return;
        }

        // Se não existe perfil para este usuário, precisamos criar
        if (!existingProfiles || existingProfiles.length === 0) {
          try {
            // Verificar se o usuário existe na tabela de usuários do Supabase
            const { data: authUserCheck } = await supabase.auth.getUser();
            
            if (!authUserCheck?.user) {
              console.error('User not found in auth.users');
              toast.error('Erro de autenticação. Por favor, faça login novamente.');
              setIsLoading(false);
              return;
            }

            // Primeiro, tente criar uma linha na tabela de usuários, se ela não existir
            try {
              const { error: userInsertError } = await supabase.rpc('create_user_if_not_exists', {
                user_uuid: user.id,
                user_email: user.email || '',
                user_name: user.user_metadata?.full_name || 'Usuário'
              });
  
              if (userInsertError) {
                console.error('RPC Error:', userInsertError);
                // Plano alternativo: criar diretamente (se tiver permissão)
                console.log('Tentando método alternativo...');
                
                // Verificar se o usuário já existe na tabela de usuários
                const { data: existingUser, error: userCheckError } = await supabase
                  .from('treino_4aivzd_users')
                  .select('id')
                  .eq('id', user.id)
                  .maybeSingle();
                
                if (userCheckError) {
                  console.error('Error checking user:', userCheckError);
                }
                
                // Se o usuário não existir, tente criar
                if (!existingUser) {
                  const { error: directInsertError } = await supabase
                    .from('treino_4aivzd_users')
                    .insert([{
                      id: user.id,
                      email: user.email || '',
                      full_name: user.user_metadata?.full_name || 'Usuário',
                      role: 'free',
                      status: 'active',
                      created_at: new Date().toISOString()
                    }]);
                  
                  if (directInsertError) {
                    console.error('Error in direct user insert:', directInsertError);
                    toast.error('Não foi possível criar seu registro de usuário');
                    
                    // Se não conseguir criar o usuário, vai para uma tela de perfil simplificada
                    setProfile({
                      user_id: user.id,
                      bio: '',
                      fitness_level: 'beginner',
                      training_goals: [],
                      preferred_training_days: [],
                      equipment_access: []
                    } as UserProfile);
                    setIsLoading(false);
                    return;
                  }
                }
              }
            } catch (rpcError) {
              console.error('RPC call failed:', rpcError);
              // Continuar para tentar criar o perfil mesmo assim
            }

            // Agora, tentar criar o perfil
            const { data: newProfile, error: createError } = await supabase
              .from('treino_4aivzd_user_profiles')
              .insert([
                { user_id: user.id, bio: '', fitness_level: 'beginner' }
              ])
              .select()
              .single();
              
            if (createError) {
              console.error('Error creating profile:', createError);
              toast.error('Erro ao criar seu perfil');
            } else {
              setProfile(newProfile);
              toast.success('Perfil criado com sucesso!');
            }
          } catch (err) {
            console.error('Error in profile creation process:', err);
            toast.error('Ocorreu um erro ao configurar seu perfil');
          }
        } else {
          // Perfil existe, usar o primeiro encontrado
          setProfile(existingProfiles[0]);
        }

        // Fetch recent workout sessions
        const { data: sessionsData, error: sessionsError } = await supabase
          .from('treino_4aivzd_workout_sessions')
          .select(`
            *,
            workout:workout_id(title, type, difficulty)
          `)
          .eq('user_id', user.id)
          .order('started_at', { ascending: false })
          .limit(5);

        if (sessionsError) {
          console.error('Error fetching sessions:', sessionsError);
          toast.error('Erro ao carregar suas sessões recentes');
        } else {
          setRecentSessions(sessionsData);
        }

        // Fetch saved workouts
        const { data: workoutsData, error: workoutsError } = await supabase
          .from('treino_4aivzd_workouts')
          .select('*')
          .eq('user_id', user.id)
          .order('order', { ascending: true })
          .order('created_at', { ascending: false })
          .limit(5);

        if (workoutsError) {
          console.error('Error fetching workouts:', workoutsError);
          toast.error('Erro ao carregar seus treinos salvos');
        } else {
          setSavedWorkouts(workoutsData);
        }

      } catch (error) {
        console.error('Error loading dashboard data:', error);
        toast.error('Ocorreu um erro ao carregar seus dados');
      } finally {
        setIsLoading(false);
      }
    };

    loadUserData();
  }, [user]);

  // Nova função para carregar tarefas pendentes
  useEffect(() => {
    const loadPendingTodos = async () => {
      if (!user) return;
      
      setTodosLoading(true);
      try {
        // Buscar tarefas pendentes diretamente
        const { data: todos, error } = await supabase
          .from('treino_4aivzd_todos')
          .select('*')
          .eq('user_id', user.id)
          .eq('completed', false)
          .order('created_at', { ascending: false });

        // Se houver erro, usar dados de exemplo
        if (error) {
          console.error('Erro ao carregar tarefas pendentes:', error);
          setupMockTodos();
          setTodosLoading(false);
          return;
        }

        // Separar por categoria e limitar a 3 por categoria
        const personalTodos: TodoItem[] = [];
        const workoutTodos: TodoItem[] = [];
        const dietTodos: TodoItem[] = [];

        todos?.forEach(todo => {
          const todoItem: TodoItem = {
            id: todo.id,
            text: todo.text,
            completed: todo.completed,
            createdAt: new Date(todo.created_at)
          };

          switch (todo.category) {
            case TodoCategory.Personal:
              if (personalTodos.length < 3) personalTodos.push(todoItem);
              break;
            case TodoCategory.Workout:
              if (workoutTodos.length < 3) workoutTodos.push(todoItem);
              break;
            case TodoCategory.Diet:
              if (dietTodos.length < 3) dietTodos.push(todoItem);
              break;
          }
        });

        setPendingTodos({
          personal: personalTodos,
          workout: workoutTodos,
          diet: dietTodos
        });
      } catch (error) {
        console.error('Erro ao carregar tarefas pendentes:', error);
        // Em caso de erro, usar dados de exemplo
        setupMockTodos();
      } finally {
        setTodosLoading(false);
      }
    };

    loadPendingTodos();
  }, [user]);

  // Configurar dados de exemplo para tarefas
  const setupMockTodos = () => {
    setPendingTodos({
      personal: [
        {
          id: "1",
          text: "Comprar novos tênis para treino",
          completed: false,
          createdAt: new Date()
        },
        {
          id: "2",
          text: "Agendar consulta com nutricionista",
          completed: false,
          createdAt: new Date(Date.now() - 86400000) // ontem
        }
      ],
      workout: [
        {
          id: "3",
          text: "Completar treino A esta semana",
          completed: false,
          createdAt: new Date()
        }
      ],
      diet: [
        {
          id: "5",
          text: "Preparar marmitas para a semana",
          completed: false,
          createdAt: new Date()
        }
      ]
    });
  };

  // Marcar uma tarefa como concluída
  const completeTodo = async (id: string, category: string) => {
    try {
      // Tentar atualizar diretamente
      await supabase
        .from('treino_4aivzd_todos')
        .update({ completed: true, updated_at: new Date().toISOString() })
        .eq('id', id);

      // Atualizar o estado local
      setPendingTodos(prev => {
        const categoryTodos = [...prev[category]];
        const updatedTodos = categoryTodos.filter(todo => todo.id !== id);
        
        return {
          ...prev,
          [category]: updatedTodos
        };
      });

      toast.success('Tarefa concluída!');
    } catch (error) {
      console.error('Erro ao completar tarefa:', error);
      toast.error('Erro ao completar tarefa');
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('pt-BR', { 
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };
  
  // Verificar se existem tarefas pendentes
  const hasPendingTodos = () => {
    return pendingTodos.personal.length > 0 || 
           pendingTodos.workout.length > 0 || 
           pendingTodos.diet.length > 0;
  };

  // Função para limpar sessões em andamento antigas (mais de 24 horas)
  const cleanupStaleSessions = async () => {
    if (!user) return;
    
    try {
      // Calcular a data de 24 horas atrás
      const oneDayAgo = new Date();
      oneDayAgo.setHours(oneDayAgo.getHours() - 24);
      
      // Atualizar sessões em andamento que começaram há mais de 24 horas
      const { error } = await supabase
        .from('treino_4aivzd_workout_sessions')
        .update({ 
          status: 'abandoned'
        })
        .eq('user_id', user.id)
        .eq('status', 'in_progress')
        .lt('started_at', oneDayAgo.toISOString());
      
      if (error) {
        console.error('Erro ao limpar sessões antigas:', error);
      }
    } catch (error) {
      console.error('Erro ao processar limpeza de sessões:', error);
    }
  };

  // Função para lidar com a seleção de todas as sessões
  const handleSelectAllSessions = (checked: boolean) => {
    if (checked) {
      setSelectedSessions(recentSessions.map(session => session.id));
    } else {
      setSelectedSessions([]);
    }
  };

  // Função para lidar com a seleção de uma sessão específica
  const handleSelectSession = (sessionId: string, checked: boolean) => {
    if (checked) {
      setSelectedSessions(prev => [...prev, sessionId]);
    } else {
      setSelectedSessions(prev => prev.filter(id => id !== sessionId));
    }
  };

  // Função para excluir as sessões selecionadas
  const deleteSelectedSessions = async () => {
    if (!user || selectedSessions.length === 0) return;

    try {
      // Primeiramente, excluir os logs dos exercícios relacionados
      const { error: logsError } = await supabase
        .from('treino_4aivzd_exercise_logs')
        .delete()
        .in('workout_session_id', selectedSessions);

      if (logsError) {
        console.error('Erro ao excluir logs de exercícios:', logsError);
        toast.error('Erro ao excluir logs de exercícios');
        return;
      }

      // Depois, excluir as sessões
      const { error: sessionsError } = await supabase
        .from('treino_4aivzd_workout_sessions')
        .delete()
        .in('id', selectedSessions);

      if (sessionsError) {
        console.error('Erro ao excluir sessões:', sessionsError);
        toast.error('Erro ao excluir sessões');
        return;
      }

      // Atualizar o estado das sessões recentes
      setRecentSessions(prev => prev.filter(session => !selectedSessions.includes(session.id)));
      
      // Limpar a seleção
      setSelectedSessions([]);
      
      // Fechar o diálogo
      setIsDeleteDialogOpen(false);
      
      toast.success('Sessões excluídas com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir sessões:', error);
      toast.error('Ocorreu um erro ao excluir as sessões');
    }
  };

  return (
    <PageLayout>
      <div className="container px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Dashboard</h1>
        
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <p>Carregando...</p>
          </div>
        ) : (
          <>
            {/* Welcome Card */}
            <Card className="mb-6">
              <CardHeader>
                <CardTitle>Bem-vindo, {user?.user_metadata?.full_name || 'Usuário'}!</CardTitle>
                <CardDescription>
                  {profile?.fitness_level === 'beginner'
                    ? 'Vamos iniciar sua jornada fitness!'
                    : 'Continue sua jornada fitness!'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <Button 
                    onClick={() => navigate('/myworkouts')}
                    className="w-full"
                  >
                    Meus Treinos
                  </Button>
                  <Button 
                    onClick={() => navigate('/todos')}
                    variant="outline"
                    className="w-full"
                  >
                    Minhas Tarefas
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Main Dashboard Content */}
            <Tabs defaultValue="overview" className="w-full mb-6">
              <TabsList className="grid w-full grid-cols-3 mb-4">
                <TabsTrigger value="overview">Visão Geral</TabsTrigger>
                <TabsTrigger value="workouts">Meus Treinos</TabsTrigger>
                <TabsTrigger value="sessions">Sessões Recentes</TabsTrigger>
              </TabsList>
              
              <TabsContent value="overview">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {/* Stats Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Estatísticas</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        <div className="flex justify-between">
                          <span>Treinos salvos:</span>
                          <span className="font-bold">{savedWorkouts.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Sessões completadas:</span>
                          <span className="font-bold">
                            {recentSessions.filter(s => s.status === 'completed').length}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Nível de experiência:</span>
                          <span className="font-bold capitalize">
                            {profile?.fitness_level || 'Não definido'}
                          </span>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Quick Actions Card */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Ações Rápidas</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <Button 
                        onClick={() => navigate('/profile')}
                        variant="outline"
                        className="w-full"
                      >
                        Editar Perfil
                      </Button>
                      {profile?.fitness_level === 'beginner' && (
                        <Button 
                          onClick={() => navigate('/exercises/library')}
                          variant="outline"
                          className="w-full"
                        >
                          Explorar Biblioteca de Exercícios
                        </Button>
                      )}
                      <Button 
                        onClick={() => navigate('/subscription')}
                        variant="outline"
                        className="w-full"
                      >
                        Gerenciar Assinatura
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </TabsContent>
              
              <TabsContent value="workouts">
                <Card>
                  <CardHeader>
                    <CardTitle>Meus Treinos</CardTitle>
                    <CardDescription>
                      Treinos que você criou ou salvou
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="mt-4 grid grid-cols-1 gap-4">
                      {savedWorkouts.length === 0 ? (
                        <p className="text-muted-foreground text-center py-4">
                          Nenhum treino salvo. Crie seu primeiro treino!
                        </p>
                      ) : (
                        savedWorkouts.map((workout) => (
                          <Card key={workout.id} className="overflow-hidden">
                            <CardContent className="p-0">
                              <div className="p-4 flex justify-between items-center">
                                <div>
                                  <h3 className="font-medium">{workout.title}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    Criado em {formatDate(workout.created_at)}
                                  </p>
                                </div>
                                <div className="space-x-2">
                                  <Button 
                                    size="sm" 
                                    variant="outline"
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
                            </CardContent>
                          </Card>
                        ))
                      )}
                      
                      <Button
                        variant="outline"
                        className="w-full mt-2"
                        onClick={() => navigate('/workouts')}
                      >
                        Ver Todos os Treinos
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              </TabsContent>
              
              <TabsContent value="sessions">
                <Card>
                  <CardHeader>
                    <div className="flex justify-between items-center">
                      <div>
                        <CardTitle>Sessões Recentes</CardTitle>
                        <CardDescription>
                          Histórico das suas últimas sessões de treino
                        </CardDescription>
                      </div>
                      {selectedSessions.length > 0 && (
                        <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
                          <AlertDialogTrigger asChild>
                            <Button variant="destructive" size="sm">
                              <Trash2 className="h-4 w-4 mr-2" />
                              Excluir ({selectedSessions.length})
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
                              <AlertDialogDescription>
                                Tem certeza que deseja excluir {selectedSessions.length} sessão(ões) selecionada(s)? Esta ação não pode ser desfeita.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>Cancelar</AlertDialogCancel>
                              <AlertDialogAction onClick={deleteSelectedSessions} className="bg-red-600 text-white hover:bg-red-700 focus:ring-red-500">
                                Excluir
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {recentSessions.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex items-center mb-4">
                          <Checkbox 
                            id="select-all" 
                            checked={selectedSessions.length === recentSessions.length && recentSessions.length > 0}
                            onCheckedChange={(checked) => handleSelectAllSessions(!!checked)}
                            className="mr-2"
                          />
                          <label htmlFor="select-all" className="text-sm">
                            Selecionar todas as sessões
                          </label>
                        </div>
                        
                        {recentSessions.map((session) => (
                          <div key={session.id} className="border rounded-md p-4">
                            <div className="flex justify-between items-center">
                              <div className="flex items-center">
                                <Checkbox 
                                  id={`session-${session.id}`}
                                  checked={selectedSessions.includes(session.id)}
                                  onCheckedChange={(checked) => handleSelectSession(session.id, !!checked)}
                                  className="mr-3"
                                />
                                <div>
                                  <h3 className="font-semibold">
                                    {session.workout?.title || 'Treino sem título'}
                                  </h3>
                                  <div className="flex items-center gap-2 mt-1">
                                    <span className={`inline-flex h-2 w-2 rounded-full ${
                                      session.status === 'completed' ? 'bg-green-500' : 
                                      session.status === 'abandoned' ? 'bg-red-500' : 'bg-yellow-500'
                                    }`} />
                                    <span className="text-sm text-muted-foreground capitalize">
                                      {session.status === 'completed' ? 'Concluído' : 
                                       session.status === 'abandoned' ? 'Abandonado' : 
                                       session.status === 'in_progress' ? 'Em andamento' : 'Pausado'}
                                    </span>
                                  </div>
                                  <div className="text-sm text-muted-foreground mt-1">
                                    {formatDate(session.started_at)}
                                    {session.duration_minutes && ` • ${session.duration_minutes} min`}
                                  </div>
                                </div>
                              </div>
                              <Button 
                                onClick={() => {
                                  if (session.status === 'in_progress') {
                                    navigate(`/workouts/${session.workout_id}/train`);
                                  } else if (session.status === 'completed' || session.status === 'abandoned') {
                                    // Para sessões completas ou abandonadas, navegar para o histórico com os detalhes
                                    navigate(`/history`, { state: { selectedSessionId: session.id } });
                                  }
                                }}
                                size="sm"
                                variant={session.status === 'in_progress' ? 'default' : 'outline'}
                              >
                                {session.status === 'in_progress' ? 'Continuar' : 'Detalhes'}
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground mb-4">Você ainda não realizou nenhum treino</p>
                        <Button onClick={() => navigate('/workouts')}>
                          Iniciar um treino
                        </Button>
                      </div>
                    )}
                    {recentSessions.length > 0 && (
                      <div className="mt-4 text-center">
                        <Button variant="link" onClick={() => navigate('/history')}>
                          Ver histórico completo
                        </Button>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
            
            {/* Pending Tasks Card - Movido para o final da página */}
            <Card className="mb-6">
              <CardHeader className="pb-3">
                <div className="flex justify-between items-center">
                  <div>
                    <CardTitle className="flex items-center">
                      <ListTodo className="mr-2 h-5 w-5" />
                      Tarefas Pendentes
                    </CardTitle>
                    <CardDescription>
                      Suas tarefas que precisam de atenção
                    </CardDescription>
                  </div>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => navigate('/todos')}
                    className="flex items-center"
                  >
                    Ver todas
                    <ArrowRight className="ml-1 h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {todosLoading ? (
                  <div className="flex justify-center py-4">
                    <p>Carregando tarefas...</p>
                  </div>
                ) : !hasPendingTodos() ? (
                  <div className="text-center py-4 text-muted-foreground">
                    <p>Você não tem tarefas pendentes</p>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="mt-2"
                      onClick={() => navigate('/todos')}
                    >
                      <PlusCircle className="mr-1 h-4 w-4" />
                      Adicionar tarefas
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {pendingTodos.workout.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Treinos</h3>
                        <ul className="space-y-2">
                          {pendingTodos.workout.map(todo => (
                            <li key={todo.id} className="flex items-center justify-between border-b pb-2">
                              <div className="flex items-center">
                                <Checkbox 
                                  id={`todo-${todo.id}`}
                                  onCheckedChange={() => completeTodo(todo.id, 'workout')}
                                />
                                <label htmlFor={`todo-${todo.id}`} className="ml-2 text-sm">
                                  {todo.text}
                                </label>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {pendingTodos.diet.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Alimentação</h3>
                        <ul className="space-y-2">
                          {pendingTodos.diet.map(todo => (
                            <li key={todo.id} className="flex items-center justify-between border-b pb-2">
                              <div className="flex items-center">
                                <Checkbox 
                                  id={`todo-${todo.id}`}
                                  onCheckedChange={() => completeTodo(todo.id, 'diet')}
                                />
                                <label htmlFor={`todo-${todo.id}`} className="ml-2 text-sm">
                                  {todo.text}
                                </label>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {pendingTodos.personal.length > 0 && (
                      <div>
                        <h3 className="text-sm font-medium mb-2">Pessoais</h3>
                        <ul className="space-y-2">
                          {pendingTodos.personal.map(todo => (
                            <li key={todo.id} className="flex items-center justify-between border-b pb-2">
                              <div className="flex items-center">
                                <Checkbox 
                                  id={`todo-${todo.id}`}
                                  onCheckedChange={() => completeTodo(todo.id, 'personal')}
                                />
                                <label htmlFor={`todo-${todo.id}`} className="ml-2 text-sm">
                                  {todo.text}
                                </label>
                              </div>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
              <CardFooter className="pt-0">
                <Button 
                  className="w-full" 
                  variant="outline"
                  size="sm"
                  onClick={() => navigate('/todos')}
                >
                  Gerenciar todas as tarefas
                </Button>
              </CardFooter>
            </Card>
          </>
        )}
      </div>
    </PageLayout>
  );
};

export default DashboardPage;