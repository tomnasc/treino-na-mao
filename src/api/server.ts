import { createServer, Response, Model } from 'miragejs';
import { v4 as uuidv4 } from 'uuid';

// Definindo os tipos localmente para evitar problemas de importação
export type TrainingParameters = {
  level: 'iniciante' | 'intermediário' | 'avançado';
  focus: string; // Foco do treino (ex: "hipertrofia", "força", "resistência")
  targetMuscles: string[]; // Músculos alvo (ex: ["peito", "costas", "pernas"])
  duration: number; // Duração em minutos
  equipment: string[]; // Equipamentos disponíveis
  frequency: number; // Frequência semanal
};

export type GeneratedTraining = {
  id: string;
  title: string;
  description: string;
  exercises: {
    name: string;
    sets: number;
    reps: number;
    rest: number; // Descanso em segundos
    instructions?: string;
  }[];
  status: 'pending' | 'completed' | 'failed';
  createdAt: Date;
  completedAt?: Date;
  source?: 'ai' | 'simulated';
};

// Função para gerar o treino (simulado)
const generateMockTraining = (params: TrainingParameters): GeneratedTraining => {
  // Mapear nomes dos exercícios baseados nos músculos alvo
  const exercisesByMuscle: Record<string, string[]> = {
    'peito': ['Supino Reto', 'Supino Inclinado', 'Crucifixo', 'Crossover'],
    'costas': ['Puxada Frontal', 'Remada Curvada', 'Pullover', 'Remada Unilateral'],
    'pernas': ['Agachamento', 'Leg Press', 'Extensora', 'Flexora', 'Panturrilha'],
    'ombros': ['Desenvolvimento', 'Elevação Lateral', 'Elevação Frontal', 'Face Pull'],
    'bíceps': ['Rosca Direta', 'Rosca Alternada', 'Rosca Martelo', 'Rosca Scott'],
    'tríceps': ['Tríceps Corda', 'Tríceps Francês', 'Tríceps Testa', 'Mergulho'],
    'abdomen': ['Abdominal Reto', 'Abdominal Infra', 'Prancha', 'Russian Twist'],
    'glúteos': ['Elevação Pélvica', 'Cadeira Abdutora', 'Agachamento Sumô', 'Stiff'],
    'antebraço': ['Rosca Punho', 'Rosca Inversa', 'Flexão de Dedos']
  };

  // Selecionar exercícios com base nos músculos alvo
  const exercises = params.targetMuscles.flatMap(muscle => {
    const muscleExercises = exercisesByMuscle[muscle.toLowerCase()] || [];
    // Pegar 1-2 exercícios por músculo, dependendo do nível
    const numExercises = params.level === 'iniciante' ? 1 : 2;
    return muscleExercises
      .slice(0, numExercises)
      .map(name => {
        // Definir séries e repetições com base no foco e nível
        let sets = 3;
        let reps = 12;
        let rest = 60;
        
        if (params.focus === 'hipertrofia') {
          sets = params.level === 'iniciante' ? 3 : params.level === 'intermediário' ? 4 : 5;
          reps = 10;
          rest = 90;
        } else if (params.focus === 'força') {
          sets = params.level === 'iniciante' ? 3 : 4;
          reps = 6;
          rest = 120;
        } else if (params.focus === 'resistência') {
          sets = 3;
          reps = 15;
          rest = 45;
        }
        
        return {
          name,
          sets,
          reps,
          rest,
          instructions: `Execute o exercício ${name} com foco em ${params.focus} mantendo a técnica correta.`
        };
      });
  });

  return {
    id: uuidv4(),
    title: `Treino de ${params.focus} - Nível ${params.level}`,
    description: `Treino personalizado de ${params.focus} para nível ${params.level}, focando em ${params.targetMuscles.join(', ')} com duração de ${params.duration} minutos.`,
    exercises,
    status: 'completed',
    createdAt: new Date(),
    completedAt: new Date(),
    source: 'simulated' // Sempre marcamos como simulado neste caso
  };
};

/**
 * Configura um servidor mock para interceptar chamadas de API durante o desenvolvimento
 */
export function setupMockServer() {
  console.log('🔄 Iniciando servidor mock para desenvolvimento...');
  
  try {
    createServer({
      models: {
        training: Model
      },
      
      routes() {
        this.namespace = 'api';
        
        // Rota para geração de treinos com IA
        this.post('/ai/generate', (_schema, request) => {
          try {
            const isFallback = request.requestHeaders['x-use-fallback'] === 'true';
            
            // Se for o primeiro request (não fallback) e não estamos em desenvolvimento, permitimos ir ao servidor real
            if (!isFallback && process.env.NODE_ENV === 'production') {
              console.log('📡 Em produção: Passthrough para API real');
              return this.passthrough();
            }
            
            console.log(`📥 Recebida solicitação para geração de treino com IA ${isFallback ? '(fallback)' : ''}`);
            const params = JSON.parse(request.requestBody) as TrainingParameters;
            
            console.log('🔍 Parâmetros recebidos:', params);
            
            // Validar parâmetros
            if (!params.level || !params.focus || !params.targetMuscles || !params.duration || !params.equipment || !params.frequency) {
              console.error('❌ Parâmetros incompletos');
              return new Response(400, {}, { error: 'Parâmetros incompletos' });
            }
            
            // Gerar treino mockado
            console.log('🏋️‍♂️ Gerando treino simulado...');
            const training = generateMockTraining(params);
            
            console.log('✅ Treino simulado gerado com sucesso:', training.title);
            return new Response(200, {}, training);
          } catch (error) {
            console.error('❌ Erro ao processar requisição:', error);
            return new Response(500, {}, { 
              error: 'Erro ao gerar treino',
              message: error instanceof Error ? error.message : 'Erro desconhecido'
            });
          }
        });
      }
    });
    
    console.log('✅ Servidor mock inicializado com sucesso!');
  } catch (error) {
    console.error('❌ Erro ao inicializar servidor mock:', error);
  }
} 