import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/supabase';
import { Workout, WorkoutType, WorkoutDifficulty, WorkoutStatus } from '../types';
import PageLayout from '../components/layout/PageLayout';
import { Button } from '../components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Input } from '../components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "../components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "../components/ui/form";
import { Textarea } from '../components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { CalendarDays, Clock, Dumbbell, Edit, MoreVertical, Play, Plus, Trash, ChevronUp, ChevronDown, ArrowUpDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../components/ui/dropdown-menu";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../components/ui/tooltip";

// Schema de validação para criação/edição de treino
const workoutSchema = z.object({
  title: z.string().min(3, { message: 'O título deve ter pelo menos 3 caracteres' }).max(100),
  description: z.string().max(500).optional(),
  type: z.string(),
  difficulty: z.string(),
  status: z.string().default('draft'),
  estimated_duration_min: z.coerce.number().min(5).max(240).optional(),
  rest_between_exercises_sec: z.coerce.number().min(0).max(300).optional(),
  is_public: z.boolean().default(false),
});

type WorkoutFormValues = z.infer<typeof workoutSchema>;

// Opções para selects
const workoutTypes = [
  { label: 'Força', value: WorkoutType.Strength },
  { label: 'Hipertrofia', value: WorkoutType.Hypertrophy },
  { label: 'Resistência', value: WorkoutType.Endurance },
  { label: 'Cardio', value: WorkoutType.Cardio },
  { label: 'HIIT', value: WorkoutType.HIIT },
  { label: 'Flexibilidade', value: WorkoutType.Flexibility },
  { label: 'Personalizado', value: WorkoutType.Custom },
];

const difficultyLevels = [
  { label: 'Iniciante', value: WorkoutDifficulty.Beginner },
  { label: 'Intermediário', value: WorkoutDifficulty.Intermediate },
  { label: 'Avançado', value: WorkoutDifficulty.Advanced },
  { label: 'Expert', value: WorkoutDifficulty.Expert },
];

const WorkoutsPage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [workouts, setWorkouts] = useState<Workout[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentWorkout, setCurrentWorkout] = useState<Workout | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [reorderMode, setReorderMode] = useState(false);

  // Formulário com validação do zod
  const form = useForm<WorkoutFormValues>({
    resolver: zodResolver(workoutSchema),
    defaultValues: {
      title: '',
      description: '',
      type: WorkoutType.Hypertrophy,
      difficulty: WorkoutDifficulty.Beginner,
      status: WorkoutStatus.Draft,
      estimated_duration_min: 45,
      rest_between_exercises_sec: 60,
      is_public: false,
    },
  });

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
          .order('order', { ascending: true })
          .order('created_at', { ascending: false });

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

  // Reiniciar formulário quando o treino atual mudar
  useEffect(() => {
    if (currentWorkout) {
      form.reset({
        title: currentWorkout.title,
        description: currentWorkout.description || '',
        type: currentWorkout.type,
        difficulty: currentWorkout.difficulty,
        status: currentWorkout.status,
        estimated_duration_min: currentWorkout.estimated_duration_min || 45,
        rest_between_exercises_sec: currentWorkout.rest_between_exercises_sec || 60,
        is_public: currentWorkout.is_public,
      });
    } else {
      form.reset({
        title: '',
        description: '',
        type: WorkoutType.Hypertrophy,
        difficulty: WorkoutDifficulty.Beginner,
        status: WorkoutStatus.Draft,
        estimated_duration_min: 45,
        rest_between_exercises_sec: 60,
        is_public: false,
      });
    }
  }, [currentWorkout, form]);

  // Filtrar treinos com base na aba ativa e pesquisa
  const filteredWorkouts = workouts.filter(workout => {
    const matchesStatus = 
      activeTab === 'all' || 
      (activeTab === 'active' && workout.status === WorkoutStatus.Active) ||
      (activeTab === 'draft' && workout.status === WorkoutStatus.Draft) ||
      (activeTab === 'archived' && workout.status === WorkoutStatus.Archived);
    
    const matchesSearch = searchQuery === '' || 
      workout.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (workout.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    return matchesStatus && matchesSearch;
  });

  // Função para criar ou atualizar um treino
  const onSubmit = async (data: WorkoutFormValues) => {
    if (!user) return;
    
    setIsSubmitting(true);
    try {
      if (currentWorkout) {
        // Atualizar treino existente
        const { error } = await supabase
          .from('treino_4aivzd_workouts')
          .update({
            title: data.title,
            description: data.description || null,
            type: data.type,
            difficulty: data.difficulty,
            status: data.status,
            estimated_duration_min: data.estimated_duration_min || null,
            rest_between_exercises_sec: data.rest_between_exercises_sec || 60,
            is_public: data.is_public,
            updated_at: new Date().toISOString()
          })
          .eq('id', currentWorkout.id);

        if (error) throw new Error(error.message);
        
        // Atualizar o treino na lista local
        setWorkouts(prev => prev.map(w => {
          if (w.id === currentWorkout.id) {
            return {
              ...w,
              title: data.title,
              description: data.description,
              type: data.type as WorkoutType,
              difficulty: data.difficulty as WorkoutDifficulty,
              status: data.status as WorkoutStatus,
              estimated_duration_min: data.estimated_duration_min,
              rest_between_exercises_sec: data.rest_between_exercises_sec,
              is_public: data.is_public
            };
          }
          return w;
        }));
        
        toast.success('Treino atualizado com sucesso!');
      } else {
        // Encontrar a maior ordem atual
        let maxOrder = 0;
        if (workouts.length > 0) {
          maxOrder = Math.max(...workouts.map(w => w.order || 0)) + 1;
        }
        
        // Criar novo treino
        const { data: newWorkout, error } = await supabase
          .from('treino_4aivzd_workouts')
          .insert({
            user_id: user.id,
            title: data.title,
            description: data.description || null,
            type: data.type,
            difficulty: data.difficulty,
            status: data.status,
            estimated_duration_min: data.estimated_duration_min || null,
            is_ai_generated: false,
            is_public: data.is_public,
            rest_between_exercises_sec: data.rest_between_exercises_sec || 60,
            order: maxOrder,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          })
          .select()
          .single();

        if (error) throw new Error(error.message);
        
        // Adicionar o novo treino à lista local
        setWorkouts(prev => [newWorkout as Workout, ...prev]);
        
        // Redirecionar para edição de exercícios
        navigate(`/workouts/${newWorkout.id}/edit`);
        toast.success('Treino criado com sucesso! Agora adicione exercícios.');
      }
      
      // Fechar o diálogo
      setOpenDialog(false);
    } catch (error) {
      console.error('Erro ao salvar treino:', error);
      toast.error('Erro ao salvar o treino');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para excluir um treino
  const deleteWorkout = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este treino?')) return;
    
    try {
      const { error } = await supabase
        .from('treino_4aivzd_workouts')
        .delete()
        .eq('id', id);

      if (error) throw new Error(error.message);
      
      // Remover o treino da lista
      setWorkouts(prev => prev.filter(w => w.id !== id));
      toast.success('Treino excluído com sucesso!');
    } catch (error) {
      console.error('Erro ao excluir treino:', error);
      toast.error('Erro ao excluir o treino');
    }
  };

  // Função para mover um treino para cima
  const moveWorkoutUp = async (index: number) => {
    if (index <= 0 || !workouts[index] || !workouts[index - 1]) return;
    
    try {
      // Criar cópias atualizadas dos treinos que serão reordenados
      const workoutToMove = {...workouts[index], order: workouts[index - 1].order || index - 1};
      const workoutToSwap = {...workouts[index - 1], order: workouts[index].order || index};
      
      // Atualizar no Supabase
      const batch = [];
      
      batch.push(
        supabase
          .from('treino_4aivzd_workouts')
          .update({ order: workoutToMove.order })
          .eq('id', workoutToMove.id)
      );
      
      batch.push(
        supabase
          .from('treino_4aivzd_workouts')
          .update({ order: workoutToSwap.order })
          .eq('id', workoutToSwap.id)
      );
      
      await Promise.all(batch);
      
      // Atualizar estado local
      const updatedWorkouts = [...workouts];
      updatedWorkouts[index] = workoutToMove;
      updatedWorkouts[index - 1] = workoutToSwap;
      updatedWorkouts.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setWorkouts(updatedWorkouts);
      toast.success('Ordem dos treinos atualizada');
      
    } catch (error) {
      console.error('Erro ao reordenar treinos:', error);
      toast.error('Erro ao reordenar os treinos');
    }
  };
  
  // Função para mover um treino para baixo
  const moveWorkoutDown = async (index: number) => {
    if (index >= workouts.length - 1 || !workouts[index] || !workouts[index + 1]) return;
    
    try {
      // Criar cópias atualizadas dos treinos que serão reordenados
      const workoutToMove = {...workouts[index], order: workouts[index + 1].order || index + 1};
      const workoutToSwap = {...workouts[index + 1], order: workouts[index].order || index};
      
      // Atualizar no Supabase
      const batch = [];
      
      batch.push(
        supabase
          .from('treino_4aivzd_workouts')
          .update({ order: workoutToMove.order })
          .eq('id', workoutToMove.id)
      );
      
      batch.push(
        supabase
          .from('treino_4aivzd_workouts')
          .update({ order: workoutToSwap.order })
          .eq('id', workoutToSwap.id)
      );
      
      await Promise.all(batch);
      
      // Atualizar estado local
      const updatedWorkouts = [...workouts];
      updatedWorkouts[index] = workoutToMove;
      updatedWorkouts[index + 1] = workoutToSwap;
      updatedWorkouts.sort((a, b) => (a.order || 0) - (b.order || 0));
      
      setWorkouts(updatedWorkouts);
      toast.success('Ordem dos treinos atualizada');
      
    } catch (error) {
      console.error('Erro ao reordenar treinos:', error);
      toast.error('Erro ao reordenar os treinos');
    }
  };

  // Renderizar o card de um treino
  const renderWorkoutCard = (workout: Workout, index: number) => {
    const getTypeLabel = (type: string) => {
      return workoutTypes.find(t => t.value === type)?.label || type;
    };
    
    const getDifficultyLabel = (difficulty: string) => {
      return difficultyLevels.find(d => d.value === difficulty)?.label || difficulty;
    };

    return (
      <Card key={workout.id} className="h-full flex flex-col">
        <CardHeader>
          <div className="flex justify-between items-start">
            <CardTitle className="text-xl">{workout.title}</CardTitle>
            <div className="flex items-center">
              {reorderMode && (
                <div className="flex flex-col mr-2">
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => moveWorkoutUp(index)}
                    disabled={index === 0}
                  >
                    <ChevronUp className="h-4 w-4" />
                    <span className="sr-only">Mover para cima</span>
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="icon" 
                    className="h-8 w-8" 
                    onClick={() => moveWorkoutDown(index)}
                    disabled={index === filteredWorkouts.length - 1}
                  >
                    <ChevronDown className="h-4 w-4" />
                    <span className="sr-only">Mover para baixo</span>
                  </Button>
                </div>
              )}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon">
                    <MoreVertical className="h-5 w-5" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem 
                    onClick={() => {
                      setCurrentWorkout(workout);
                      setOpenDialog(true);
                    }}
                  >
                    <Edit className="h-4 w-4 mr-2" />
                    Editar
                  </DropdownMenuItem>
                  <DropdownMenuItem 
                    onClick={() => navigate(`/workouts/${workout.id}/edit`)}
                  >
                    <Dumbbell className="h-4 w-4 mr-2" />
                    Editar exercícios
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem 
                    onClick={() => deleteWorkout(workout.id)}
                    className="text-destructive"
                  >
                    <Trash className="h-4 w-4 mr-2" />
                    Excluir
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          <CardDescription>
            <div className="flex flex-wrap gap-2 mt-1">
              <span className="bg-primary/10 text-primary px-2 py-0.5 rounded-full text-xs">
                {getTypeLabel(workout.type)}
              </span>
              <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-xs">
                {getDifficultyLabel(workout.difficulty)}
              </span>
              {workout.status === WorkoutStatus.Draft && (
                <span className="bg-yellow-100 text-yellow-800 px-2 py-0.5 rounded-full text-xs">
                  Rascunho
                </span>
              )}
              {workout.status === WorkoutStatus.Active && (
                <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                  Ativo
                </span>
              )}
              {workout.status === WorkoutStatus.Archived && (
                <span className="bg-gray-100 text-gray-800 px-2 py-0.5 rounded-full text-xs">
                  Arquivado
                </span>
              )}
            </div>
          </CardDescription>
        </CardHeader>
        <CardContent className="flex-grow">
          <p className="text-sm text-muted-foreground line-clamp-3">
            {workout.description || "Sem descrição."}
          </p>
          
          <div className="mt-4 space-y-2">
            {workout.estimated_duration_min && (
              <div className="flex items-center text-sm text-muted-foreground">
                <Clock className="h-4 w-4 mr-2" />
                <span>{workout.estimated_duration_min} minutos</span>
              </div>
            )}
            <div className="flex items-center text-sm text-muted-foreground">
              <CalendarDays className="h-4 w-4 mr-2" />
              <span>Criado em {new Date(workout.created_at).toLocaleDateString('pt-BR')}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="border-t pt-4">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  className="w-full" 
                  onClick={() => navigate(`/workouts/${workout.id}/train`)}
                >
                  <Play className="h-4 w-4 mr-2" />
                  Iniciar Treino
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Iniciar sessão de treino</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </CardFooter>
      </Card>
    );
  };
  
  return (
    <PageLayout>
      <div className="container py-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Meus Treinos</h1>
          <div className="flex gap-2">
            <Button
              variant={reorderMode ? "default" : "outline"}
              onClick={() => setReorderMode(!reorderMode)}
              className="flex items-center"
            >
              <ArrowUpDown className="mr-2 h-4 w-4" />
              {reorderMode ? "Concluir Reordenação" : "Reordenar Treinos"}
            </Button>
            <Button onClick={() => navigate('/workouts/new')}>
              <Plus className="mr-2 h-4 w-4" /> Novo Treino
            </Button>
          </div>
        </div>
        
        {reorderMode && (
          <div className="bg-blue-50 border border-blue-200 rounded-md p-3 mb-4 text-blue-800 text-sm">
            <p>
              <strong>Modo de reordenação:</strong> Use as setas para cima e para baixo para 
              reorganizar seus treinos. A ordem será salva automaticamente.
            </p>
          </div>
        )}
        
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
            <Tabs defaultValue="all" className="w-full" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="grid w-full grid-cols-4">
                <TabsTrigger value="all">Todos</TabsTrigger>
                <TabsTrigger value="active">Ativos</TabsTrigger>
                <TabsTrigger value="draft">Rascunhos</TabsTrigger>
                <TabsTrigger value="archived">Arquivados</TabsTrigger>
              </TabsList>
            </Tabs>
            
            <div className="w-full md:w-auto">
              <Input
                placeholder="Buscar treinos..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="md:w-[300px]"
              />
            </div>
          </div>
          
          {isLoading ? (
            <div className="flex justify-center items-center h-40">
              <p>Carregando treinos...</p>
            </div>
          ) : filteredWorkouts.length === 0 ? (
            <div className="text-center py-12 border rounded-lg">
              <Dumbbell className="h-12 w-12 mx-auto text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">Sem treinos encontrados</h3>
              <p className="mt-2 text-muted-foreground">
                {searchQuery ? "Nenhum treino corresponde à sua busca." : "Crie seu primeiro treino para começar!"}
              </p>
              {!searchQuery && (
                <Button 
                  className="mt-6"
                  onClick={() => {
                    setCurrentWorkout(null);
                    setOpenDialog(true);
                  }}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Treino
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredWorkouts.map((workout, index) => renderWorkoutCard(workout, index))}
            </div>
          )}
        </div>
      </div>
      
      {/* Diálogo de criação/edição de treino */}
      <Dialog open={openDialog} onOpenChange={setOpenDialog}>
        <DialogContent className="sm:max-w-[550px]">
          <DialogHeader>
            <DialogTitle>{currentWorkout ? 'Editar Treino' : 'Novo Treino'}</DialogTitle>
            <DialogDescription>
              {currentWorkout 
                ? 'Edite as informações do seu treino. Para adicionar exercícios, use a opção "Editar exercícios".' 
                : 'Preencha as informações básicas do seu treino. Você poderá adicionar exercícios em seguida.'}
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Título</FormLabel>
                    <FormControl>
                      <Input placeholder="Ex: Treino ABC - Semana 1" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descrição (opcional)</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Descreva seu treino..." 
                        className="resize-none" 
                        {...field} 
                        value={field.value || ''}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Tipo</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione o tipo" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {workoutTypes.map(type => (
                            <SelectItem key={type.value} value={type.value}>
                              {type.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="difficulty"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Dificuldade</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Selecione a dificuldade" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {difficultyLevels.map(difficulty => (
                            <SelectItem key={difficulty.value} value={difficulty.value}>
                              {difficulty.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="estimated_duration_min"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Duração Estimada (min)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <FormField
                  control={form.control}
                  name="rest_between_exercises_sec"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Descanso entre exercícios (seg)</FormLabel>
                      <FormControl>
                        <Input type="number" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              
              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select onValueChange={field.onChange} value={field.value}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Selecione o status" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value={WorkoutStatus.Draft}>Rascunho</SelectItem>
                        <SelectItem value={WorkoutStatus.Active}>Ativo</SelectItem>
                        <SelectItem value={WorkoutStatus.Archived}>Arquivado</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setOpenDialog(false);
                    setCurrentWorkout(null);
                  }}
                  type="button"
                >
                  Cancelar
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Salvando...' : currentWorkout ? 'Atualizar' : 'Criar'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </PageLayout>
  );
};

export default WorkoutsPage; 