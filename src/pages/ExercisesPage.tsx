import React, { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useAuth } from '../contexts/AuthContext';
import supabase from '../lib/supabase';
import { Exercise, ExerciseCategory, ExerciseDifficulty, UserRole, ExerciseEditHistory } from '../types';
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
import { Check, Edit, MoreVertical, Plus, Search, Trash, X, History, Database } from 'lucide-react';
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
import { Badge } from '../components/ui/badge';
import { Checkbox } from '../components/ui/checkbox';

// Schema de validação para criação/edição de exercício
const exerciseSchema = z.object({
  name: z.string().min(3, { message: 'O nome deve ter pelo menos 3 caracteres' }).max(100),
  description: z.string().max(500).optional(),
  muscle_groups: z.array(z.string()).min(1, { message: 'Selecione pelo menos um grupo muscular' }),
  equipment: z.array(z.string()).optional(),
  category: z.nativeEnum(ExerciseCategory),
  difficulty: z.nativeEnum(ExerciseDifficulty),
  youtube_video_id: z.string().optional(),
});

type ExerciseFormValues = z.infer<typeof exerciseSchema>;

// Opções para selects
const exerciseCategories = [
  { label: 'Composto', value: ExerciseCategory.Compound },
  { label: 'Isolamento', value: ExerciseCategory.Isolation },
  { label: 'Peso Corporal', value: ExerciseCategory.Bodyweight },
  { label: 'Cardio', value: ExerciseCategory.Cardio },
  { label: 'Máquina', value: ExerciseCategory.Machine },
  { label: 'Alongamento', value: ExerciseCategory.Stretching },
];

const difficultyLevels = [
  { label: 'Iniciante', value: ExerciseDifficulty.Beginner },
  { label: 'Intermediário', value: ExerciseDifficulty.Intermediate },
  { label: 'Avançado', value: ExerciseDifficulty.Advanced },
];

const muscleGroups = [
  'Peito', 'Costas', 'Ombros', 'Bíceps', 'Tríceps', 'Antebraço',
  'Abdômen', 'Quadríceps', 'Isquiotibiais', 'Glúteos', 'Panturrilha',
  'Lombar', 'Trapézio', 'Core', 'Cardio'
];

const equipmentOptions = [
  'Halteres', 'Barra', 'Máquina', 'Banco', 'Kettlebell', 'Corda',
  'Elásticos', 'Bola', 'TRX', 'Peso corporal', 'Bicicleta', 'Esteira'
];

const ExercisesPage: React.FC = () => {
  const { user } = useAuth();
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [openDialog, setOpenDialog] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentExercise, setCurrentExercise] = useState<Exercise | null>(null);
  const [activeTab, setActiveTab] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [editHistory, setEditHistory] = useState<ExerciseEditHistory[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [showHistoryDialog, setShowHistoryDialog] = useState(false);
  const [selectedExerciseForHistory, setSelectedExerciseForHistory] = useState<Exercise | null>(null);

  // Formulário com validação do zod
  const form = useForm<ExerciseFormValues>({
    resolver: zodResolver(exerciseSchema),
    defaultValues: {
      name: '',
      description: '',
      muscle_groups: [],
      equipment: [],
      category: ExerciseCategory.Compound,
      difficulty: ExerciseDifficulty.Beginner,
      youtube_video_id: '',
    },
  });

  // Carregar exercícios e detalhes de usuários
  useEffect(() => {
    const loadExercises = async () => {
      setIsLoading(true);
      try {
        // Obter exercícios com join para informações do criador
        const { data, error } = await supabase
          .from('treino_4aivzd_exercises')
          .select(`
            *,
            creator:created_by (
              id, 
              full_name
            )
          `)
          .order('name');

        if (error) {
          throw new Error(error.message);
        }

        setExercises(data || []);
      } catch (error) {
        console.error('Erro ao carregar exercícios:', error);
        toast.error('Erro ao carregar exercícios');
      } finally {
        setIsLoading(false);
      }
    };

    loadExercises();
  }, []);

  // Reiniciar formulário quando o exercício atual mudar
  useEffect(() => {
    if (currentExercise) {
      form.reset({
        name: currentExercise.name,
        description: currentExercise.description || '',
        muscle_groups: currentExercise.muscle_groups || [],
        equipment: currentExercise.equipment || [],
        category: currentExercise.category,
        difficulty: currentExercise.difficulty,
        youtube_video_id: currentExercise.youtube_video_id || '',
      });
    } else {
      form.reset({
        name: '',
        description: '',
        muscle_groups: [],
        equipment: [],
        category: ExerciseCategory.Compound,
        difficulty: ExerciseDifficulty.Beginner,
        youtube_video_id: '',
      });
    }
  }, [currentExercise, form]);

  // Filtrar exercícios com base na pesquisa
  const filteredExercises = exercises.filter(exercise => {
    if (searchQuery === '') return true;
    
    return exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
           (exercise.description?.toLowerCase().includes(searchQuery.toLowerCase())) ||
           exercise.muscle_groups.some(group => group.toLowerCase().includes(searchQuery.toLowerCase()));
  });

  // Verificar se o usuário tem permissão para editar ou excluir o exercício
  const hasEditPermission = (exercise: Exercise) => {
    if (!user) return false;
    if (user.role === UserRole.Admin) return true;
    return exercise.created_by === user.id;
  };

  // Função para criar ou atualizar um exercício
  const onSubmit = async (data: ExerciseFormValues) => {
    if (!user) return;
    
    // Verificar permissão de edição se for atualização
    if (currentExercise && !hasEditPermission(currentExercise)) {
      toast.error('Você não tem permissão para editar este exercício. Apenas o criador ou administradores podem editar exercícios.');
      return;
    }
    
    setIsSubmitting(true);
    try {
      const exerciseData = {
        ...data,
        created_by: currentExercise?.created_by || user.id,
        is_verified: user.role === UserRole.Admin || (currentExercise?.is_verified || false),
      };

      if (currentExercise) {
        // Atualizar exercício existente
        const { error } = await supabase
          .from('treino_4aivzd_exercises')
          .update(exerciseData)
          .eq('id', currentExercise.id);
        
        if (error) throw new Error(error.message);
        
        toast.success('Exercício atualizado com sucesso!');
        
        // Atualizar estado local
        setExercises(prev => prev.map(ex => 
          ex.id === currentExercise.id ? { ...ex, ...exerciseData } : ex
        ));
      } else {
        // Criar novo exercício
        const { data: newExercise, error } = await supabase
          .from('treino_4aivzd_exercises')
          .insert(exerciseData)
          .select()
          .single();
        
        if (error) throw new Error(error.message);
        
        toast.success('Exercício criado com sucesso!');
        
        // Atualizar estado local
        if (newExercise) {
          setExercises(prev => [...prev, newExercise as Exercise]);
        }
      }
      
      // Fechar diálogo
      setOpenDialog(false);
      setCurrentExercise(null);
    } catch (error) {
      console.error('Erro ao salvar exercício:', error);
      toast.error('Erro ao salvar exercício');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Função para excluir um exercício
  const deleteExercise = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este exercício?')) return;
    
    try {
      // Verificar se o usuário é o criador ou um administrador
      const exerciseToDelete = exercises.find(ex => ex.id === id);
      
      if (!exerciseToDelete) {
        toast.error('Exercício não encontrado');
        return;
      }
      
      // Verificar permissão - apenas criadores e admins podem excluir
      if (exerciseToDelete.created_by && 
          exerciseToDelete.created_by !== user?.id && 
          user?.role !== UserRole.Admin) {
        toast.error('Você não tem permissão para excluir este exercício. Apenas o criador ou administradores podem excluir exercícios.');
        return;
      }
      
      // Proceder com a exclusão
      const { error } = await supabase
        .from('treino_4aivzd_exercises')
        .delete()
        .eq('id', id);
      
      if (error) throw new Error(error.message);
      
      toast.success('Exercício excluído com sucesso!');
      
      // Atualizar estado local
      setExercises(prev => prev.filter(ex => ex.id !== id));
    } catch (error) {
      console.error('Erro ao excluir exercício:', error);
      toast.error('Erro ao excluir exercício');
    }
  };

  // Função para carregar histórico de edições de um exercício
  const loadExerciseHistory = async (exerciseId: string) => {
    if (!exerciseId) return;
    
    setIsLoadingHistory(true);
    try {
      const { data, error } = await supabase
        .from('treino_4aivzd_exercise_edit_history')
        .select('*')
        .eq('exercise_id', exerciseId)
        .order('timestamp', { ascending: false })
        .limit(5);
      
      if (error) throw new Error(error.message);
      
      setEditHistory(data || []);
    } catch (error) {
      console.error('Erro ao carregar histórico de edições:', error);
      toast.error('Erro ao carregar histórico de edições');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const openHistoryDialog = (exercise: Exercise) => {
    setSelectedExerciseForHistory(exercise);
    setShowHistoryDialog(true);
    loadExerciseHistory(exercise.id);
  };

  // Renderizar histórico de edições
  const renderExerciseHistoryDialog = () => {
    return (
      <Dialog open={showHistoryDialog} onOpenChange={setShowHistoryDialog}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>
              Histórico de Edições: {selectedExerciseForHistory?.name}
            </DialogTitle>
            <DialogDescription>
              Últimas 5 alterações realizadas neste exercício
            </DialogDescription>
          </DialogHeader>

          {isLoadingHistory ? (
            <div className="flex justify-center py-8">
              <span className="text-muted-foreground">Carregando histórico...</span>
            </div>
          ) : editHistory.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-muted-foreground">Nenhum registro de edição encontrado</p>
            </div>
          ) : (
            <div className="space-y-4 max-h-[400px] overflow-y-auto">
              {editHistory.map((entry) => (
                <Card key={entry.id} className="p-4">
                  <div className="flex justify-between items-start mb-2">
                    <div>
                      <p className="font-medium">
                        {entry.action === 'create' ? 'Criação' : 
                         entry.action === 'update' ? 'Atualização' : 'Exclusão'}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Por: {entry.user_name || 'Usuário desconhecido'}
                      </p>
                    </div>
                    <Badge variant="outline">
                      {new Date(entry.timestamp).toLocaleString('pt-BR')}
                    </Badge>
                  </div>
                  
                  {entry.action === 'update' && entry.changes && (
                    <div className="mt-2 space-y-2">
                      <p className="text-sm font-medium">Alterações:</p>
                      <div className="space-y-1 text-sm">
                        {Object.entries(entry.changes || {}).map(([field, value]) => (
                          <div key={field} className="grid grid-cols-3 gap-2">
                            <span className="font-medium">{field}:</span>
                            <span className="text-muted-foreground line-through">
                              {typeof value === 'object' && value !== null && 'old' in value 
                                ? JSON.stringify(value.old) 
                                : ''}
                            </span>
                            <span>
                              {typeof value === 'object' && value !== null && 'new' in value 
                                ? JSON.stringify(value.new)
                                : JSON.stringify(value)}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </Card>
              ))}
            </div>
          )}
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowHistoryDialog(false)}>
              Fechar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  };

  // Componente para renderizar os cards de exercícios
  const renderExerciseCard = (exercise: Exercise) => {
    // Verificar se o usuário atual pode editar e excluir este exercício
    const canEditOrDelete = hasEditPermission(exercise);
    
    return (
      <Card key={exercise.id} className="overflow-hidden">
        <CardHeader className="p-4">
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-lg">{exercise.name}</CardTitle>
              <CardDescription className="line-clamp-2 mt-1">
                {exercise.description || 'Sem descrição'}
              </CardDescription>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {canEditOrDelete ? (
                  <DropdownMenuItem onClick={() => {
                    setCurrentExercise(exercise);
                    setOpenDialog(true);
                  }}>
                    <Edit className="mr-2 h-4 w-4" />
                    Editar
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem
                    className="text-muted-foreground cursor-not-allowed opacity-50"
                    disabled
                  >
                    <Edit className="mr-2 h-4 w-4" />
                    Editar (sem permissão)
                  </DropdownMenuItem>
                )}
                <DropdownMenuItem onClick={() => openHistoryDialog(exercise)}>
                  <History className="mr-2 h-4 w-4" />
                  Ver Histórico
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {canEditOrDelete ? (
                  <DropdownMenuItem 
                    className="text-destructive focus:text-destructive"
                    onClick={() => deleteExercise(exercise.id)}
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Excluir
                  </DropdownMenuItem>
                ) : (
                  <DropdownMenuItem 
                    className="text-muted-foreground cursor-not-allowed opacity-50"
                    disabled
                  >
                    <Trash className="mr-2 h-4 w-4" />
                    Excluir (sem permissão)
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </CardHeader>
        <CardContent className="p-4 pt-0">
          <div className="flex flex-wrap gap-1 mt-2">
            {exercise.muscle_groups.map(group => (
              <Badge key={group} variant="secondary">{group}</Badge>
            ))}
          </div>
          <div className="flex justify-between items-center mt-3">
            <Badge variant="outline">{
              exerciseCategories.find(cat => cat.value === exercise.category)?.label || exercise.category
            }</Badge>
            <Badge>{
              difficultyLevels.find(diff => diff.value === exercise.difficulty)?.label || exercise.difficulty
            }</Badge>
          </div>
          {/* Exibir informações do criador */}
          {exercise.creator && (
            <div className="mt-3 text-xs text-muted-foreground">
              Criado por: {(exercise.creator as any).full_name || 'Usuário desconhecido'}
            </div>
          )}
          {exercise.is_verified && (
            <div className="mt-1 flex items-center text-xs text-green-600">
              <Check className="h-3 w-3 mr-1" /> Verificado
            </div>
          )}
        </CardContent>
      </Card>
    );
  };

  return (
    <PageLayout>
      <div className="container py-6">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold">Biblioteca de Exercícios</h1>
          <div className="flex gap-2">
            <Dialog open={openDialog} onOpenChange={setOpenDialog}>
              <DialogTrigger asChild>
                <Button onClick={() => setCurrentExercise(null)}>
                  <Plus className="mr-2 h-4 w-4" /> Novo Exercício
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>{currentExercise ? 'Editar Exercício' : 'Novo Exercício'}</DialogTitle>
                  <DialogDescription>
                    Preencha os detalhes do exercício. Clique em salvar quando finalizar.
                  </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                    <FormField
                      control={form.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nome do Exercício</FormLabel>
                          <FormControl>
                            <Input placeholder="Ex: Supino Reto" {...field} />
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
                          <FormLabel>Descrição</FormLabel>
                          <FormControl>
                            <Textarea 
                              placeholder="Descreva como realizar o exercício..." 
                              {...field} 
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Categoria</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione uma categoria" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {exerciseCategories.map(category => (
                                <SelectItem key={category.value} value={category.value}>
                                  {category.label}
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
                          <FormLabel>Nível de Dificuldade</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione um nível" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {difficultyLevels.map(level => (
                                <SelectItem key={level.value} value={level.value}>
                                  {level.label}
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
                      name="muscle_groups"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel>Grupos Musculares</FormLabel>
                            <FormDescription>
                              Selecione todos os grupos musculares trabalhados.
                            </FormDescription>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {muscleGroups.map((group) => (
                              <FormField
                                key={group}
                                control={form.control}
                                name="muscle_groups"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={group}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(group)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value, group])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== group
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal cursor-pointer">
                                        {group}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="equipment"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel>Equipamentos</FormLabel>
                            <FormDescription>
                              Selecione os equipamentos necessários.
                            </FormDescription>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {equipmentOptions.map((equipment) => (
                              <FormField
                                key={equipment}
                                control={form.control}
                                name="equipment"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={equipment}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(equipment)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value || [], equipment])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== equipment
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal cursor-pointer">
                                        {equipment}
                                      </FormLabel>
                                    </FormItem>
                                  )
                                }}
                              />
                            ))}
                          </div>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="youtube_video_id"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>ID do Vídeo YouTube</FormLabel>
                          <FormControl>
                            <Input 
                              placeholder="Ex: dQw4w9WgXcQ" 
                              {...field} 
                              value={field.value || ''}
                            />
                          </FormControl>
                          <FormDescription>
                            Digite apenas o ID do vídeo (a parte após v= na URL).
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <DialogFooter className="pt-4">
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => setOpenDialog(false)}
                      >
                        Cancelar
                      </Button>
                      <Button type="submit" disabled={isSubmitting}>
                        {isSubmitting ? 'Salvando...' : 'Salvar Exercício'}
                      </Button>
                    </DialogFooter>
                  </form>
                </Form>
              </DialogContent>
            </Dialog>
            {user?.role === UserRole.Admin && (
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button 
                      variant="outline" 
                      size="sm"
                      onClick={async () => {
                        if (confirm('Deseja executar o script para criar a tabela de histórico de edições? Isso irá configurar o rastreamento de alterações nos exercícios.')) {
                          try {
                            // Ler conteúdo do script
                            const response = await fetch('/create_exercise_edit_history_table.sql');
                            const sqlScript = await response.text();
                            
                            // Executar o script
                            const { error } = await supabase.rpc('exec_sql', { 
                              sql_query: sqlScript 
                            });
                            
                            if (error) throw error;
                            
                            toast.success('Tabela de histórico criada com sucesso!');
                          } catch (error) {
                            console.error('Erro ao executar script:', error);
                            toast.error('Erro ao criar tabela de histórico. Verifique o console para mais detalhes.');
                          }
                        }
                      }}
                    >
                      <Database className="h-4 w-4 mr-2" />
                      Instalar Rastreamento
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p className="max-w-xs">
                      Cria a tabela de histórico de edições e configura triggers para rastrear alterações nos exercícios.
                    </p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            )}
          </div>
        </div>
        
        <div className="max-w-md mb-6">
          <div className="relative">
            <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar exercícios..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                className="absolute right-0 top-0 h-full"
                onClick={() => setSearchQuery('')}
              >
                <X className="h-4 w-4" />
              </Button>
            )}
          </div>
        </div>
        
        {isLoading ? (
          <div className="flex justify-center py-12">
            <span>Carregando exercícios...</span>
          </div>
        ) : (
          <>
            {filteredExercises.length === 0 ? (
              <div className="text-center py-12">
                <p className="text-muted-foreground mb-4">Nenhum exercício encontrado</p>
                <Button onClick={() => setOpenDialog(true)}>
                  <Plus className="mr-2 h-4 w-4" /> Adicionar Exercício
                </Button>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                {filteredExercises.map(renderExerciseCard)}
              </div>
            )}
          </>
        )}
        {renderExerciseHistoryDialog()}
      </div>
    </PageLayout>
  );
};

export default ExercisesPage; 