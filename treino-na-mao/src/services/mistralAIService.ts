/**
 * Serviço para integração com a API do Hugging Face para o modelo Mistral-7B-Instruct
 */

// No lado do cliente, fazemos requisições para nossa própria API Next.js
const API_BASE_URL = '/api/ai';

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
};

/**
 * Gera um treino personalizado usando o modelo Mistral-7B-Instruct via API do Next.js
 */
export const generateTraining = async (
  params: TrainingParameters
): Promise<GeneratedTraining> => {
  try {
    console.log('Gerando treino com parâmetros:', params);
    
    // Fazemos a requisição para nossa própria API
    const response = await fetch(`${API_BASE_URL}/generate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(params)
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`Erro na API: ${errorData.message || response.statusText}`);
    }

    // Obtém a resposta - nossa API já retorna no formato esperado
    const result = await response.json();
    
    // A API já retorna os dados no formato correto, apenas ajustamos as datas
    return {
      ...result,
      createdAt: new Date(result.createdAt),
      completedAt: result.completedAt ? new Date(result.completedAt) : undefined
    };
  } catch (error) {
    console.error("Erro ao gerar treino com IA:", error);
    
    // Retorna um objeto de treino com status de falha
    return {
      id: crypto.randomUUID(),
      title: "Falha na geração do treino",
      description: "Ocorreu um erro ao gerar o treino com IA. Por favor, tente novamente.",
      exercises: [],
      status: 'failed',
      createdAt: new Date()
    };
  }
};

/**
 * Verifica o status de uma requisição assíncrona
 * Esta função não é mais necessária, pois estamos usando uma abordagem síncrona
 * com nossa própria API Next.js. Mantida para compatibilidade.
 */
export const checkGenerationStatus = async (requestId: string): Promise<GeneratedTraining | null> => {
  try {
    // Simula uma chamada bem-sucedida já que estamos usando uma abordagem síncrona agora
    return null;
  } catch (error) {
    console.error("Erro ao verificar status de geração:", error);
    return null;
  }
}; 