/**
 * Serviço para integração com a API do Hugging Face para o modelo Mistral-7B-Instruct
 */

import { v4 as uuidv4 } from 'uuid';

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
  // Adicionando campo de origem para identificar se o treino foi gerado pela IA real ou simulado
  source?: 'ai' | 'simulated';
};

/**
 * Gera um treino personalizado usando o modelo Mistral-7B-Instruct via API do Next.js
 * Se a API real falhar, usa o fallback para simular o treino
 */
export const generateTraining = async (
  params: TrainingParameters
): Promise<GeneratedTraining> => {
  try {
    console.log('Gerando treino com parâmetros:', params);
    
    // Tentativa de usar a API real
    try {
      // Fazemos a requisição para nossa própria API
      const response = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(params)
      });

      if (!response.ok) {
        let errorMessage = '';
        try {
          const errorData = await response.json();
          errorMessage = errorData.message || response.statusText;
        } catch (e) {
          errorMessage = `Erro ${response.status}: ${response.statusText}`;
        }
        throw new Error(`Erro na API: ${errorMessage}`);
      }

      // Obtém a resposta - nossa API já retorna no formato esperado
      const result = await response.json();
      
      // A API já retorna os dados no formato correto, apenas ajustamos as datas e marcamos como IA real
      return {
        ...result,
        createdAt: new Date(result.createdAt),
        completedAt: result.completedAt ? new Date(result.completedAt) : undefined,
        source: 'ai' // Marcamos que este treino foi gerado pela IA real
      };
    } catch (error) {
      console.warn("Falha ao usar a API real, utilizando modo simulado:", error);
      
      // Se a API real falhar, usamos a versão simulada (implementada pelo MirageJS)
      // O MirageJS já irá interceptar a segunda chamada e retornar dados simulados
      const fallbackResponse = await fetch(`${API_BASE_URL}/generate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Use-Fallback': 'true' // Header especial para indicar que estamos usando o fallback
        },
        body: JSON.stringify(params)
      });
      
      if (!fallbackResponse.ok) {
        throw new Error(`Erro na API de fallback: ${fallbackResponse.statusText}`);
      }
      
      const fallbackResult = await fallbackResponse.json();
      
      // Ajustamos as datas e marcamos como simulado
      return {
        ...fallbackResult,
        createdAt: new Date(fallbackResult.createdAt),
        completedAt: fallbackResult.completedAt ? new Date(fallbackResult.completedAt) : undefined,
        source: 'simulated' // Marcamos que este treino foi gerado pela simulação
      };
    }
  } catch (error) {
    console.error("Erro ao gerar treino com IA:", error);
    
    // Retorna um objeto de treino com status de falha
    return {
      id: uuidv4(),
      title: "Falha na geração do treino",
      description: "Ocorreu um erro ao gerar o treino com IA. Por favor, tente novamente.",
      exercises: [],
      status: 'failed',
      source: 'simulated',
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