import React, { useState } from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAITraining } from '../../contexts/AITrainingContext';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from '../ui/form';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Input } from '../ui/input';
import { Slider } from '../ui/slider';
import { Checkbox } from '../ui/checkbox';
import { Textarea } from '../ui/textarea';
import { ScrollArea } from '../ui/scroll-area';
import { TrainingParameters } from '../../services/mistralAIService';

// Esquema de validação do formulário
const formSchema = z.object({
  level: z.enum(['iniciante', 'intermediário', 'avançado'], {
    required_error: 'Selecione seu nível de experiência',
  }),
  focus: z.string().min(1, 'Informe o foco do treino'),
  targetMuscles: z.array(z.string()).min(1, 'Selecione pelo menos um grupo muscular'),
  duration: z.number().min(15, 'O treino deve ter no mínimo 15 minutos').max(120, 'O treino deve ter no máximo 120 minutos'),
  equipment: z.array(z.string()),
  frequency: z.number().min(1, 'Escolha quantas vezes por semana você treinará').max(7, 'O máximo é 7 dias por semana'),
});

type FormValues = z.infer<typeof formSchema>;

// Lista de grupos musculares
const muscleGroups = [
  { id: 'peito', label: 'Peito' },
  { id: 'costas', label: 'Costas' },
  { id: 'ombros', label: 'Ombros' },
  { id: 'biceps', label: 'Bíceps' },
  { id: 'triceps', label: 'Tríceps' },
  { id: 'pernas', label: 'Pernas' },
  { id: 'gluteos', label: 'Glúteos' },
  { id: 'abdomen', label: 'Abdômen' },
  { id: 'panturrilhas', label: 'Panturrilhas' },
];

// Lista de equipamentos
const equipmentList = [
  { id: 'halteres', label: 'Halteres' },
  { id: 'barras', label: 'Barras' },
  { id: 'maquinas', label: 'Máquinas' },
  { id: 'kettlebell', label: 'Kettlebell' },
  { id: 'peso_corporal', label: 'Peso Corporal' },
  { id: 'faixas_elasticas', label: 'Faixas Elásticas' },
  { id: 'bola_suica', label: 'Bola Suíça' },
  { id: 'corda', label: 'Corda' },
  { id: 'trx', label: 'TRX / Suspensão' },
];

// Lista de objetivos de treino
const trainingFocus = [
  { value: 'hipertrofia', label: 'Hipertrofia' },
  { value: 'força', label: 'Força' },
  { value: 'resistencia', label: 'Resistência' },
  { value: 'perda_peso', label: 'Perda de Peso' },
  { value: 'condicionamento', label: 'Condicionamento' },
  { value: 'definicao', label: 'Definição Muscular' },
];

const AITrainingForm: React.FC = () => {
  const { generateAITraining, isGenerating } = useAITraining();
  const [selectedMuscles, setSelectedMuscles] = useState<string[]>([]);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>(['peso_corporal']);

  // Inicialização do formulário
  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      level: 'iniciante',
      focus: 'hipertrofia',
      targetMuscles: [],
      duration: 60,
      equipment: ['peso_corporal'],
      frequency: 3,
    },
  });

  // Manipulação de envio do formulário
  const onSubmit = async (data: FormValues) => {
    // Convertendo os dados para o formato esperado pelo serviço
    const params: TrainingParameters = {
      level: data.level as TrainingParameters['level'],
      focus: data.focus,
      targetMuscles: data.targetMuscles,
      duration: data.duration,
      equipment: data.equipment,
      frequency: data.frequency,
    };

    // Chamando o serviço para gerar o treino
    await generateAITraining(params);
  };

  // Manipulador para seleção de músculos
  const handleMuscleToggle = (muscle: string) => {
    setSelectedMuscles((prev) => {
      const newSelection = prev.includes(muscle)
        ? prev.filter((m) => m !== muscle)
        : [...prev, muscle];
      
      form.setValue('targetMuscles', newSelection);
      return newSelection;
    });
  };

  // Manipulador para seleção de equipamentos
  const handleEquipmentToggle = (equipment: string) => {
    setSelectedEquipment((prev) => {
      const newSelection = prev.includes(equipment)
        ? prev.filter((e) => e !== equipment)
        : [...prev, equipment];
      
      form.setValue('equipment', newSelection);
      return newSelection;
    });
  };

  return (
    <Card className="w-full max-w-3xl mx-auto">
      <CardHeader>
        <CardTitle>Geração de Treino com IA</CardTitle>
        <CardDescription>
          Informe suas preferências e objetivos para gerar um treino personalizado
        </CardDescription>
      </CardHeader>
      
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            {/* Nível de experiência */}
            <FormField
              control={form.control}
              name="level"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Nível de Experiência</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione seu nível" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      <SelectItem value="iniciante">Iniciante</SelectItem>
                      <SelectItem value="intermediário">Intermediário</SelectItem>
                      <SelectItem value="avançado">Avançado</SelectItem>
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    Seu nível de experiência com exercícios físicos
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Foco do treino */}
            <FormField
              control={form.control}
              name="focus"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Objetivo do Treino</FormLabel>
                  <Select 
                    onValueChange={field.onChange} 
                    defaultValue={field.value}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Selecione o objetivo" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {trainingFocus.map((focus) => (
                        <SelectItem key={focus.value} value={focus.value}>
                          {focus.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormDescription>
                    O objetivo principal do seu treino
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Duração */}
            <FormField
              control={form.control}
              name="duration"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração (minutos): {field.value}</FormLabel>
                  <FormControl>
                    <Slider
                      min={15}
                      max={120}
                      step={5}
                      defaultValue={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Tempo total da sessão de treino
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Frequência */}
            <FormField
              control={form.control}
              name="frequency"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Frequência Semanal: {field.value} {field.value === 1 ? 'vez' : 'vezes'}</FormLabel>
                  <FormControl>
                    <Slider
                      min={1}
                      max={7}
                      step={1}
                      defaultValue={[field.value]}
                      onValueChange={(value) => field.onChange(value[0])}
                    />
                  </FormControl>
                  <FormDescription>
                    Quantas vezes por semana você planeja treinar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Grupos Musculares */}
            <FormField
              control={form.control}
              name="targetMuscles"
              render={() => (
                <FormItem>
                  <FormLabel>Grupos Musculares</FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {muscleGroups.map((muscle) => (
                      <div key={muscle.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`muscle-${muscle.id}`}
                          checked={selectedMuscles.includes(muscle.id)}
                          onCheckedChange={() => handleMuscleToggle(muscle.id)}
                        />
                        <label
                          htmlFor={`muscle-${muscle.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {muscle.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormDescription>
                    Selecione os grupos musculares que deseja trabalhar
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            {/* Equipamentos */}
            <FormField
              control={form.control}
              name="equipment"
              render={() => (
                <FormItem>
                  <FormLabel>Equipamentos Disponíveis</FormLabel>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mt-2">
                    {equipmentList.map((equipment) => (
                      <div key={equipment.id} className="flex items-center space-x-2">
                        <Checkbox
                          id={`equipment-${equipment.id}`}
                          checked={selectedEquipment.includes(equipment.id)}
                          onCheckedChange={() => handleEquipmentToggle(equipment.id)}
                        />
                        <label
                          htmlFor={`equipment-${equipment.id}`}
                          className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                        >
                          {equipment.label}
                        </label>
                      </div>
                    ))}
                  </div>
                  <FormDescription>
                    Selecione os equipamentos que você tem disponível
                  </FormDescription>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="pt-4">
              <Button type="submit" className="w-full" disabled={isGenerating}>
                {isGenerating ? 'Gerando Treino...' : 'Gerar Treino Personalizado'}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
};

export default AITrainingForm; 