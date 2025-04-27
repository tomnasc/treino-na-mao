import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'sonner';
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod';
import { useForm } from 'react-hook-form';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

import { useAuth } from '../contexts/AuthContext';
import PageLayout from '../components/layout/PageLayout';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../components/ui/form';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '../components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '../components/ui/select';
import { Input } from '../components/ui/input';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Checkbox } from '../components/ui/checkbox';
import { Calendar } from '../components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '../components/ui/popover';
import { UserProfile } from '../types';
import supabase from '../lib/supabase';

// Schema de validação do formulário
const profileSchema = z.object({
  bio: z.string().max(500, { message: 'A bio deve ter no máximo 500 caracteres' }),
  height_cm: z.coerce.number().min(100, { message: 'Altura inválida' }).max(250, { message: 'Altura inválida' }).optional(),
  weight_kg: z.coerce.number().min(30, { message: 'Peso inválido' }).max(300, { message: 'Peso inválido' }).optional(),
  gender: z.string().optional(),
  birth_date: z.date().optional(),
  fitness_level: z.string(),
  training_goals: z.array(z.string()).optional(),
  preferred_training_days: z.array(z.string()).optional(),
  training_experience_years: z.coerce.number().min(0).max(50).optional(),
  equipment_access: z.array(z.string()).optional(),
  health_limitations: z.string().optional(),
});

// Opções para os campos de seleção
const fitnessLevels = [
  { label: 'Iniciante', value: 'beginner' },
  { label: 'Intermediário', value: 'intermediate' },
  { label: 'Avançado', value: 'advanced' },
  { label: 'Atleta', value: 'athlete' },
];

const genderOptions = [
  { label: 'Masculino', value: 'male' },
  { label: 'Feminino', value: 'female' },
];

const trainingGoals = [
  { label: 'Perda de peso', value: 'weight_loss' },
  { label: 'Ganho de massa muscular', value: 'muscle_gain' },
  { label: 'Resistência', value: 'endurance' },
  { label: 'Força', value: 'strength' },
  { label: 'Flexibilidade', value: 'flexibility' },
  { label: 'Saúde geral', value: 'general_health' },
  { label: 'Definição muscular', value: 'muscle_definition' },
];

// Dias da semana começando com domingo
const weekDays = [
  { label: 'Domingo', value: 'sunday' },
  { label: 'Segunda-feira', value: 'monday' },
  { label: 'Terça-feira', value: 'tuesday' },
  { label: 'Quarta-feira', value: 'wednesday' },
  { label: 'Quinta-feira', value: 'thursday' },
  { label: 'Sexta-feira', value: 'friday' },
  { label: 'Sábado', value: 'saturday' },
];

const equipmentOptions = [
  { label: 'Peso livre (halteres)', value: 'dumbbells' },
  { label: 'Barras', value: 'barbells' },
  { label: 'Máquinas', value: 'machines' },
  { label: 'Kettlebells', value: 'kettlebells' },
  { label: 'Elásticos', value: 'bands' },
  { label: 'TRX/Suspensão', value: 'trx' },
  { label: 'Bola suíça', value: 'swiss_ball' },
  { label: 'Corda para pular', value: 'jump_rope' },
  { label: 'Sem equipamento', value: 'no_equipment' },
];

// Função para salvar o estado do formulário no localStorage
const saveFormState = (data: any) => {
  localStorage.setItem('profileFormState', JSON.stringify(data));
};

// Função para recuperar o estado do formulário do localStorage
const getFormState = () => {
  const savedState = localStorage.getItem('profileFormState');
  return savedState ? JSON.parse(savedState) : null;
};

const ProfilePage: React.FC = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [formInitialized, setFormInitialized] = useState(false);

  // Formulário com validação do zod
  const form = useForm<z.infer<typeof profileSchema>>({
    resolver: zodResolver(profileSchema),
    defaultValues: {
      bio: '',
      fitness_level: 'beginner',
      training_goals: [],
      preferred_training_days: [],
      equipment_access: [],
      health_limitations: '',
    },
  });

  // Watch para salvar o estado do formulário enquanto o usuário preenche
  const formValues = form.watch();
  useEffect(() => {
    if (formInitialized) {
      saveFormState(formValues);
    }
  }, [formValues, formInitialized]);

  // Carregar o perfil do usuário
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      setIsLoading(true);
      try {
        // Verificar se há um estado salvo no localStorage
        const savedState = getFormState();
        
        // Se houver dados salvos e o usuário não tiver completado o envio,
        // usamos esses dados temporários
        if (savedState && !savedState._submitted) {
          form.reset(savedState);
          setFormInitialized(true);
          setIsLoading(false);
          return;
        }
        
        // Caso contrário, carregamos do banco de dados
        const { data, error } = await supabase
          .from('treino_4aivzd_user_profiles')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (error) {
          throw new Error(error.message);
        }

        setProfile(data);
        
        // Converte as limitações de saúde para string para edição no TextArea
        const healthLimitationsStr = Array.isArray(data.health_limitations) 
          ? data.health_limitations.join('\n') 
          : data.health_limitations || '';
        
        // Preencher o formulário com os dados do perfil
        form.reset({
          bio: data.bio || '',
          height_cm: data.height_cm || undefined,
          weight_kg: data.weight_kg || undefined,
          gender: data.gender || '',
          birth_date: data.birth_date ? new Date(data.birth_date) : undefined,
          fitness_level: data.fitness_level || 'beginner',
          training_goals: data.training_goals || [],
          preferred_training_days: data.preferred_training_days || [],
          training_experience_years: data.training_experience_years || undefined,
          equipment_access: data.equipment_access || [],
          health_limitations: healthLimitationsStr,
        });
        
        // Limpar qualquer estado salvo temporariamente
        localStorage.removeItem('profileFormState');
        setFormInitialized(true);
      } catch (error) {
        console.error('Error loading profile:', error);
        toast.error('Erro ao carregar perfil');
      } finally {
        setIsLoading(false);
      }
    };

    loadProfile();
  }, [user, form]);

  // Salvar o perfil
  const onSubmit = async (data: z.infer<typeof profileSchema>) => {
    if (!user) return;
    
    setIsSaving(true);
    try {
      // Processar limitações de saúde (convertendo de string para array se necessário)
      const healthLimitationsArray = data.health_limitations 
        ? data.health_limitations.split('\n').filter(item => item.trim() !== '') 
        : [];
      
      const { error } = await supabase
        .from('treino_4aivzd_user_profiles')
        .update({
          bio: data.bio,
          height_cm: data.height_cm,
          weight_kg: data.weight_kg,
          gender: data.gender,
          birth_date: data.birth_date ? format(data.birth_date, 'yyyy-MM-dd') : null,
          fitness_level: data.fitness_level,
          training_goals: data.training_goals,
          preferred_training_days: data.preferred_training_days,
          training_experience_years: data.training_experience_years,
          equipment_access: data.equipment_access,
          health_limitations: healthLimitationsArray,
          last_updated: new Date().toISOString(),
        })
        .eq('user_id', user.id);

      if (error) {
        throw new Error(error.message);
      }

      toast.success('Perfil atualizado com sucesso!');
      
      // Após sucesso, marcar como enviado e limpar o localStorage
      localStorage.removeItem('profileFormState');
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Erro ao atualizar perfil');
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <PageLayout>
        <div className="container py-8">
          <div className="flex justify-center items-center h-[60vh]">
            <p>Carregando perfil...</p>
          </div>
        </div>
      </PageLayout>
    );
  }

  return (
    <PageLayout>
      <div className="container py-8">
        <h1 className="text-3xl font-bold mb-6">Seu Perfil</h1>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="md:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle>Informações Pessoais</CardTitle>
                <CardDescription>Seu perfil no Treino na Mão</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col items-center">
                  <div className="w-24 h-24 rounded-full bg-primary/10 flex items-center justify-center text-2xl font-bold text-primary mb-4">
                    {user?.user_metadata?.full_name ? 
                      user.user_metadata.full_name.split(' ').map((n: string) => n[0]).join('').toUpperCase().substring(0, 2) : 
                      user?.email?.substring(0, 2).toUpperCase()}
                  </div>
                  <h3 className="text-xl font-semibold">{user?.user_metadata?.full_name || 'Usuário'}</h3>
                  <p className="text-muted-foreground">{user?.email}</p>
                  
                  <div className="w-full mt-6 pt-6 border-t">
                    <div className="flex justify-between mb-3">
                      <span className="text-muted-foreground">Nível:</span>
                      <span className="font-medium capitalize">
                        {fitnessLevels.find(l => l.value === profile?.fitness_level)?.label || 'Iniciante'}
                      </span>
                    </div>
                    
                    {profile?.training_experience_years && (
                      <div className="flex justify-between mb-3">
                        <span className="text-muted-foreground">Experiência:</span>
                        <span className="font-medium">
                          {profile.training_experience_years} {profile.training_experience_years === 1 ? 'ano' : 'anos'}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="md:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle>Editar Perfil</CardTitle>
                <CardDescription>Atualize suas informações e preferências de treino</CardDescription>
              </CardHeader>
              <CardContent>
                <Form {...form}>
                  <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="height_cm"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Altura (cm)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Ex: 175" 
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
                        name="weight_kg"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Peso (kg)</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                placeholder="Ex: 70" 
                                {...field} 
                                value={field.value || ''} 
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="gender"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Gênero</FormLabel>
                            <Select 
                              onValueChange={field.onChange} 
                              value={field.value || ''}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Selecione seu gênero" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {genderOptions.map(option => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
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
                        name="birth_date"
                        render={({ field }) => (
                          <FormItem className="flex flex-col">
                            <FormLabel>Data de Nascimento</FormLabel>
                            <Popover>
                              <PopoverTrigger asChild>
                                <FormControl>
                                  <Button
                                    variant="outline"
                                    className="text-left font-normal"
                                  >
                                    {field.value ? (
                                      format(field.value, 'dd/MM/yyyy')
                                    ) : (
                                      <span className="text-muted-foreground">Selecione uma data</span>
                                    )}
                                  </Button>
                                </FormControl>
                              </PopoverTrigger>
                              <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                  mode="single"
                                  selected={field.value}
                                  onSelect={field.onChange}
                                  locale={ptBR}
                                  weekStartsOn={0} /* 0 = domingo */
                                  showOutsideDays={false}
                                  initialFocus
                                  captionLayout="dropdown-buttons" 
                                  fromYear={1940} 
                                  toYear={2010}
                                />
                              </PopoverContent>
                            </Popover>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    
                    <FormField
                      control={form.control}
                      name="bio"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Biografia</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Conte um pouco sobre você e seus objetivos de treino..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Máximo de 500 caracteres
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={form.control}
                      name="fitness_level"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Nível de Condicionamento</FormLabel>
                          <Select 
                            onValueChange={field.onChange} 
                            value={field.value || ''}
                          >
                            <FormControl>
                              <SelectTrigger>
                                <SelectValue placeholder="Selecione seu nível" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              {fitnessLevels.map(level => (
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
                      name="training_experience_years"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Anos de Experiência com Treinos</FormLabel>
                          <FormControl>
                            <Input 
                              type="number" 
                              placeholder="Ex: 2" 
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
                      name="training_goals"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Objetivos de Treino</FormLabel>
                            <FormDescription>
                              Selecione todos os que se aplicam
                            </FormDescription>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {trainingGoals.map((item) => (
                              <FormField
                                key={item.value}
                                control={form.control}
                                name="training_goals"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={item.value}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(item.value)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value || [], item.value])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== item.value
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {item.label}
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
                      name="preferred_training_days"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Dias Preferidos para Treino</FormLabel>
                            <FormDescription>
                              Selecione os dias em que você normalmente treina
                            </FormDescription>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {weekDays.map((item) => (
                              <FormField
                                key={item.value}
                                control={form.control}
                                name="preferred_training_days"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={item.value}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(item.value)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value || [], item.value])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== item.value
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {item.label}
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
                      name="equipment_access"
                      render={() => (
                        <FormItem>
                          <div className="mb-4">
                            <FormLabel className="text-base">Equipamentos Disponíveis</FormLabel>
                            <FormDescription>
                              Selecione os equipamentos que você tem acesso
                            </FormDescription>
                          </div>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                            {equipmentOptions.map((item) => (
                              <FormField
                                key={item.value}
                                control={form.control}
                                name="equipment_access"
                                render={({ field }) => {
                                  return (
                                    <FormItem
                                      key={item.value}
                                      className="flex flex-row items-start space-x-3 space-y-0"
                                    >
                                      <FormControl>
                                        <Checkbox
                                          checked={field.value?.includes(item.value)}
                                          onCheckedChange={(checked) => {
                                            return checked
                                              ? field.onChange([...field.value || [], item.value])
                                              : field.onChange(
                                                  field.value?.filter(
                                                    (value) => value !== item.value
                                                  )
                                                )
                                          }}
                                        />
                                      </FormControl>
                                      <FormLabel className="font-normal">
                                        {item.label}
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
                      name="health_limitations"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Limitações de Saúde ou Lesões</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Descreva quaisquer lesões ou limitações que possam afetar seus treinos..."
                              className="resize-none"
                              {...field}
                            />
                          </FormControl>
                          <FormDescription>
                            Digite cada limitação em uma linha separada
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <Button type="submit" className="w-full" disabled={isSaving}>
                      {isSaving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                  </form>
                </Form>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </PageLayout>
  );
};

export default ProfilePage; 