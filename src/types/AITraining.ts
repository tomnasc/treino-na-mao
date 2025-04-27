// src/types/AITraining.ts

// Tipos de objetivos de treino
export type TrainingGoal = 
  | 'hipertrofia'
  | 'emagrecimento'
  | 'resistência'
  | 'força'
  | 'condicionamento'
  | 'outro';

// Níveis de experiência
export type TrainingLevel = 
  | 'iniciante'
  | 'intermediário'
  | 'avançado';

// Tipos de equipamentos
export type Equipment = 
  | 'halteres'
  | 'barras'
  | 'máquinas'
  | 'elásticos'
  | 'corpo livre'
  | 'peso corporal'
  | 'kettlebell'
  | 'corda'
  | 'outro';

// Interface principal para dados de treinamento com IA
export interface AITrainingData {
  goal: TrainingGoal;
  level: TrainingLevel;
  duration: number; // duração em minutos
  equipment: Equipment[];
  focusAreas?: string[]; // áreas opcionais de foco (ex: 'costas', 'pernas')
  restrictions?: string[]; // restrições opcionais (ex: 'lesão no joelho')
  preferences?: string[]; // preferências opcionais (ex: 'exercícios curtos', 'alta intensidade')
}

// Interface para respostas da API de IA
export interface AIResponse {
  success: boolean;
  data?: {
    content: string;
    suggestions?: string[];
  };
  error?: string;
}

// Estado do contexto de treinamento com IA
export interface AITrainingContextState {
  loading: boolean;
  error: string | null;
  generatedWorkout: string | null;
  workoutHistory: string[];
} 