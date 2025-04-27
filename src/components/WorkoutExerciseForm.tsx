import React from 'react';
import { WorkoutExercise, Exercise, ExerciseTrackingType } from '../types';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { Textarea } from './ui/textarea';
import { FormProvider, useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "./ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";

// Schema para adicionar/editar exercício
const workoutExerciseSchema = z.object({
  tracking_type: z.nativeEnum(ExerciseTrackingType),
  sets: z.coerce.number().min(1, { message: 'Mínimo de 1 série' }).max(20, { message: 'Máximo de 20 séries' }),
  reps_per_set: z.coerce.number().min(1, { message: 'Mínimo de 1 repetição' }).max(100, { message: 'Máximo de 100 repetições' }).optional(),
  duration_sec: z.coerce.number().min(1, { message: 'Mínimo de 1 segundo' }).max(600, { message: 'Máximo de 600 segundos' }).optional(),
  rest_after_sec: z.coerce.number().min(0, { message: 'Mínimo de 0 segundos' }).max(300, { message: 'Máximo de 300 segundos' }).optional(),
  notes: z.string().max(500, { message: 'Máximo de 500 caracteres' }).optional(),
});

export type WorkoutExerciseFormValues = z.infer<typeof workoutExerciseSchema>;

interface WorkoutExerciseFormProps {
  exercise: Exercise;
  defaultValues?: Partial<WorkoutExerciseFormValues>;
  onSubmit: (exerciseId: string, values: WorkoutExerciseFormValues) => void;
  onCancel: () => void;
  isSubmitting?: boolean;
}

const WorkoutExerciseForm: React.FC<WorkoutExerciseFormProps> = ({
  exercise,
  defaultValues,
  onSubmit,
  onCancel,
  isSubmitting = false
}) => {
  const form = useForm<WorkoutExerciseFormValues>({
    resolver: zodResolver(workoutExerciseSchema),
    defaultValues: {
      tracking_type: defaultValues?.tracking_type || ExerciseTrackingType.Weight,
      sets: defaultValues?.sets || 3,
      reps_per_set: defaultValues?.reps_per_set || 12,
      duration_sec: defaultValues?.duration_sec || 30,
      rest_after_sec: defaultValues?.rest_after_sec || 60,
      notes: defaultValues?.notes || '',
    },
  });

  const trackingType = form.watch('tracking_type');

  const handleSubmit = (values: WorkoutExerciseFormValues) => {
    onSubmit(exercise.id, values);
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(handleSubmit)} className="space-y-4">
        <div className="mb-4">
          <h3 className="text-lg font-medium">{exercise.name}</h3>
          <p className="text-sm text-muted-foreground">
            {exercise.description || 'Sem descrição disponível'}
          </p>
        </div>

        <FormField
          control={form.control}
          name="tracking_type"
          render={({ field }) => (
            <FormItem className="space-y-3">
              <FormLabel>Tipo de Exercício</FormLabel>
              <FormControl>
                <RadioGroup
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={ExerciseTrackingType.Weight} id="tracking-weight" />
                    <FormLabel htmlFor="tracking-weight" className="cursor-pointer">Baseado em Carga/Peso</FormLabel>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value={ExerciseTrackingType.Time} id="tracking-time" />
                    <FormLabel htmlFor="tracking-time" className="cursor-pointer">Baseado em Tempo</FormLabel>
                  </div>
                </RadioGroup>
              </FormControl>
              <FormDescription>
                Escolha se o exercício será baseado em carga/peso ou em tempo. Exercícios baseados em carga/peso usam repetições e peso, enquanto exercícios baseados em tempo usam duração em segundos.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="sets"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Séries</FormLabel>
                <FormControl>
                  <Input type="number" min={1} max={20} {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          {trackingType === ExerciseTrackingType.Weight ? (
            <>
              <FormField
                control={form.control}
                name="reps_per_set"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Repetições por série</FormLabel>
                    <FormControl>
                      <Input 
                        type="number" 
                        min={1} 
                        max={100} 
                        {...field} 
                        value={field.value || ''} 
                        placeholder="Ex: 12"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </>
          ) : (
            <FormField
              control={form.control}
              name="duration_sec"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Duração (segundos)</FormLabel>
                  <FormControl>
                    <Input 
                      type="number" 
                      min={1} 
                      max={600} 
                      {...field} 
                      value={field.value || ''} 
                      placeholder="Ex: 30"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          )}

          <FormField
            control={form.control}
            name="rest_after_sec"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Descanso (segundos)</FormLabel>
                <FormControl>
                  <Input 
                    type="number" 
                    min={0} 
                    max={300} 
                    {...field} 
                    value={field.value || ''} 
                    placeholder="Ex: 60"
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="notes"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Observações</FormLabel>
              <FormControl>
                <Textarea 
                  placeholder="Observações opcionais sobre o exercício..." 
                  {...field} 
                  value={field.value || ''}
                />
              </FormControl>
              <FormDescription>
                Instruções específicas para este exercício.
              </FormDescription>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="flex justify-end gap-2 pt-2">
          <Button type="button" variant="outline" onClick={onCancel}>
            Cancelar
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Salvando...' : 'Salvar'}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default WorkoutExerciseForm; 