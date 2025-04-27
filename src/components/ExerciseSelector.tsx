import React, { useState, useEffect, useRef } from 'react';
import { Input } from './ui/input';
import { Checkbox } from './ui/checkbox';
import { Button } from './ui/button';
import { Badge } from './ui/badge';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from './ui/card';
import { Search, X, Check, Filter, Plus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "./ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "./ui/tooltip";
import { Exercise, ExerciseCategory, ExerciseDifficulty } from '../types';
import supabase from '../lib/supabase';
import { toast } from 'sonner';

interface ExerciseSelectorProps {
  onSelect: (exercises: Exercise[]) => void;
  selectedExercises?: Exercise[];
  buttonText?: string;
  showSelectedOnly?: boolean;
}

const ExerciseSelector: React.FC<ExerciseSelectorProps> = ({
  onSelect,
  selectedExercises = [],
  buttonText = "Selecionar Exercícios",
  showSelectedOnly: initialShowSelected = false,
}) => {
  const [open, setOpen] = useState(false);
  const [exercises, setExercises] = useState<Exercise[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterDifficulty, setFilterDifficulty] = useState<string>('all');
  const [filterMuscleGroup, setFilterMuscleGroup] = useState<string>('all');
  const [selected, setSelected] = useState<{[key: string]: boolean}>({});
  const [showSelectedOnly, setShowSelectedOnly] = useState(initialShowSelected);
  const previousSelectedRef = useRef<string[]>([]);

  // Opções para filtros
  const exerciseCategories = [
    { label: 'Todos', value: 'all' },
    { label: 'Composto', value: ExerciseCategory.Compound },
    { label: 'Isolamento', value: ExerciseCategory.Isolation },
    { label: 'Peso Corporal', value: ExerciseCategory.Bodyweight },
    { label: 'Cardio', value: ExerciseCategory.Cardio },
    { label: 'Máquina', value: ExerciseCategory.Machine },
    { label: 'Alongamento', value: ExerciseCategory.Stretching },
  ];

  const difficultyLevels = [
    { label: 'Todos', value: 'all' },
    { label: 'Iniciante', value: ExerciseDifficulty.Beginner },
    { label: 'Intermediário', value: ExerciseDifficulty.Intermediate },
    { label: 'Avançado', value: ExerciseDifficulty.Advanced },
  ];

  const muscleGroups = [
    { label: 'Todos', value: 'all' },
    { label: 'Peito', value: 'Peito' },
    { label: 'Costas', value: 'Costas' },
    { label: 'Ombros', value: 'Ombros' },
    { label: 'Bíceps', value: 'Bíceps' },
    { label: 'Tríceps', value: 'Tríceps' },
    { label: 'Antebraço', value: 'Antebraço' },
    { label: 'Abdômen', value: 'Abdômen' },
    { label: 'Quadríceps', value: 'Quadríceps' },
    { label: 'Isquiotibiais', value: 'Isquiotibiais' },
    { label: 'Glúteos', value: 'Glúteos' },
    { label: 'Panturrilha', value: 'Panturrilha' },
    { label: 'Lombar', value: 'Lombar' },
    { label: 'Trapézio', value: 'Trapézio' },
    { label: 'Core', value: 'Core' },
    { label: 'Cardio', value: 'Cardio' },
  ];

  // Carregar exercícios ao abrir o seletor
  useEffect(() => {
    if (open) {
      loadExercises();
    }
  }, [open]);

  // Inicializar exercícios selecionados
  useEffect(() => {
    // Verifica se a lista de exercícios selecionados realmente mudou
    const currentSelectedIds = selectedExercises.map(e => e.id).sort().join(',');
    const previousSelectedIds = previousSelectedRef.current.join(',');
    
    if (currentSelectedIds !== previousSelectedIds) {
      const initialSelected: {[key: string]: boolean} = {};
      selectedExercises.forEach(exercise => {
        initialSelected[exercise.id] = true;
      });
      setSelected(initialSelected);
      previousSelectedRef.current = selectedExercises.map(e => e.id).sort();
    }
  }, [selectedExercises]);

  const loadExercises = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('treino_4aivzd_exercises')
        .select('*')
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

  // Filtrar exercícios conforme os critérios
  const filteredExercises = exercises.filter(exercise => {
    // Filtro de pesquisa por texto
    const matchesSearch = searchQuery === '' || 
      exercise.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exercise.description?.toLowerCase().includes(searchQuery.toLowerCase()));
    
    // Filtro por categoria
    const matchesCategory = filterCategory === 'all' || exercise.category === filterCategory;
    
    // Filtro por dificuldade
    const matchesDifficulty = filterDifficulty === 'all' || exercise.difficulty === filterDifficulty;
    
    // Filtro por grupo muscular
    const matchesMuscleGroup = filterMuscleGroup === 'all' || 
      exercise.muscle_groups.includes(filterMuscleGroup);
    
    // Filtro para mostrar apenas selecionados
    const matchesSelected = !showSelectedOnly || selected[exercise.id] === true;
    
    return matchesSearch && matchesCategory && matchesDifficulty && matchesMuscleGroup && matchesSelected;
  });

  // Toggle seleção de exercício
  const toggleExercise = (exercise: Exercise) => {
    setSelected(prev => ({
      ...prev,
      [exercise.id]: !prev[exercise.id]
    }));
  };

  // Confirmar seleção
  const confirmSelection = () => {
    const selectedExercisesList = exercises.filter(exercise => selected[exercise.id]);
    onSelect(selectedExercisesList);
    setOpen(false);
  };

  // Limpar filtros
  const clearFilters = () => {
    setSearchQuery('');
    setFilterCategory('all');
    setFilterDifficulty('all');
    setFilterMuscleGroup('all');
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            {buttonText}
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[800px] max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>Selecionar Exercícios</DialogTitle>
            <DialogDescription>
              Busque e selecione os exercícios para o seu treino.
            </DialogDescription>
          </DialogHeader>
          
          <div className="flex flex-col space-y-4 overflow-hidden">
            {/* Barra de busca */}
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
            
            {/* Filtros */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Select value={filterCategory} onValueChange={setFilterCategory}>
                <SelectTrigger>
                  <SelectValue placeholder="Categoria" />
                </SelectTrigger>
                <SelectContent>
                  {exerciseCategories.map(category => (
                    <SelectItem key={category.value} value={category.value}>
                      {category.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterDifficulty} onValueChange={setFilterDifficulty}>
                <SelectTrigger>
                  <SelectValue placeholder="Dificuldade" />
                </SelectTrigger>
                <SelectContent>
                  {difficultyLevels.map(level => (
                    <SelectItem key={level.value} value={level.value}>
                      {level.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              
              <Select value={filterMuscleGroup} onValueChange={setFilterMuscleGroup}>
                <SelectTrigger>
                  <SelectValue placeholder="Grupo Muscular" />
                </SelectTrigger>
                <SelectContent>
                  {muscleGroups.map(group => (
                    <SelectItem key={group.value} value={group.value}>
                      {group.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex justify-between items-center">
              <Button variant="outline" size="sm" onClick={clearFilters}>
                Limpar Filtros
              </Button>
              
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSelectedOnly(!showSelectedOnly)}
              >
                {showSelectedOnly ? "Mostrar Todos" : "Mostrar Selecionados"}
              </Button>
              
              <span className="text-sm text-muted-foreground">
                {Object.values(selected).filter(Boolean).length} selecionados
              </span>
            </div>
            
            {/* Lista de exercícios */}
            <div className="overflow-y-auto min-h-[300px] max-h-[500px] border rounded-md p-2">
              {isLoading ? (
                <div className="flex justify-center items-center h-full">
                  <span>Carregando exercícios...</span>
                </div>
              ) : filteredExercises.length === 0 ? (
                <div className="flex flex-col justify-center items-center h-64">
                  <p className="text-muted-foreground">Nenhum exercício encontrado</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {filteredExercises.map(exercise => (
                    <div 
                      key={exercise.id} 
                      className={`p-3 border rounded-md cursor-pointer transition-colors ${
                        selected[exercise.id] ? 'bg-primary/10 border-primary' : ''
                      }`}
                      onClick={() => toggleExercise(exercise)}
                    >
                      <div className="flex justify-between items-start">
                        <div className="flex-1">
                          <h4 className="font-medium">{exercise.name}</h4>
                          <p className="text-sm text-muted-foreground line-clamp-1">
                            {exercise.description || 'Sem descrição'}
                          </p>
                        </div>
                        <div className="ml-2">
                          <div className={`h-5 w-5 rounded-full border flex items-center justify-center ${
                            selected[exercise.id] ? 'bg-primary border-primary text-primary-foreground' : ''
                          }`}>
                            {selected[exercise.id] && <Check className="h-3 w-3" />}
                          </div>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1 mt-2">
                        {exercise.muscle_groups.slice(0, 3).map(group => (
                          <Badge key={group} variant="secondary" className="text-xs">{group}</Badge>
                        ))}
                        {exercise.muscle_groups.length > 3 && (
                          <Badge variant="secondary" className="text-xs">+{exercise.muscle_groups.length - 3}</Badge>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
          
          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={confirmSelection}>
              Confirmar Seleção
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Exibir exercícios selecionados */}
      {selectedExercises.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-2">
          {selectedExercises.map(exercise => (
            <Badge 
              key={exercise.id} 
              variant="outline"
              className="flex items-center gap-1 py-1 px-2"
            >
              {exercise.name}
              <X 
                className="h-3 w-3 cursor-pointer hover:text-destructive" 
                onClick={() => {
                  const updatedExercises = selectedExercises.filter(e => e.id !== exercise.id);
                  onSelect(updatedExercises);
                }}
              />
            </Badge>
          ))}
        </div>
      )}
    </>
  );
};

export default ExerciseSelector; 