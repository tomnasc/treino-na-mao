import { NextApiRequest, NextApiResponse } from 'next';
import { TrainingParameters, GeneratedTraining } from '@/services/mistralAIService';
// Importa e configura o dotenv para carregar variáveis de ambiente do arquivo .env
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config();

// URL da API do Hugging Face
const HUGGING_FACE_API_URL = "https://api-inference.huggingface.co/models/mistralai/Mistral-7B-Instruct-v0.2";

// Função para gerar o prompt baseado nos parâmetros
const generatePrompt = (params: TrainingParameters): string => {
  return `Crie um treino de ${params.focus} para um aluno de nível ${params.level} 
com duração de ${params.duration} minutos. 
O treino deve focar nos seguintes grupos musculares: ${params.targetMuscles.join(', ')}.
Equipamentos disponíveis: ${params.equipment.join(', ')}.
Frequência semanal: ${params.frequency} vezes.

O treino deve seguir este formato JSON:
{
  "title": "Título do Treino",
  "description": "Breve descrição do treino e seus objetivos",
  "exercises": [
    {
      "name": "Nome do Exercício",
      "sets": numeroSeries,
      "reps": numeroRepeticoes,
      "rest": tempoDescansoEmSegundos,
      "instructions": "Instruções detalhadas para execução correta"
    }
  ]
}

Não inclua nenhum outro texto além do JSON.`;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  // Apenas aceita requisições POST
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Método não permitido' });
  }

  try {
    const params = req.body as TrainingParameters;
    
    // Verifica se é uma chamada de fallback (ou seja, uma segunda tentativa depois que a API real falhou)
    const isFallback = req.headers['x-use-fallback'] === 'true';
    
    // Valida os parâmetros
    if (!params.level || !params.focus || !params.targetMuscles || !params.duration || !params.equipment || !params.frequency) {
      return res.status(400).json({ error: 'Parâmetros incompletos' });
    }

    // Obtém o token da API de variáveis de ambiente
    const token = process.env.HUGGING_FACE_API_TOKEN;
    
    // Verifica se o token está disponível
    if (!token) {
      console.warn('Token da API Hugging Face não configurado no servidor');
      return res.status(500).json({ 
        error: 'Configuração incompleta',
        message: 'Token da API Hugging Face não configurado no servidor'
      });
    }

    // Gera o prompt e faz a chamada para a API
    const prompt = generatePrompt(params);
    
    try {
      console.log(`🤖 Enviando solicitação para API Hugging Face (${isFallback ? 'fallback' : 'primeira tentativa'})`);
      
      const response = await fetch(HUGGING_FACE_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          inputs: prompt,
          parameters: {
            max_new_tokens: 2048,
            temperature: 0.7,
            top_p: 0.95,
            return_full_text: false
          }
        })
      });

      // Verifica se a resposta foi bem-sucedida
      if (!response.ok) {
        throw new Error(`Erro na API do Hugging Face: ${response.statusText}`);
      }

      // Processa o resultado
      const result = await response.json();
      const jsonResponseStr = result[0].generated_text.trim();
      const parsedResponse = JSON.parse(jsonResponseStr);
      
      console.log('✅ Treino gerado com sucesso pela IA');
      
      // Formata a resposta
      const training: GeneratedTraining = {
        id: uuidv4(),
        title: parsedResponse.title,
        description: parsedResponse.description,
        exercises: parsedResponse.exercises,
        status: 'completed',
        source: 'ai', // Marca como gerado pela IA real
        createdAt: new Date(),
        completedAt: new Date()
      };

      return res.status(200).json(training);
    } catch (aiError) {
      console.error("Erro na API do Hugging Face:", aiError);
      
      // Se não for uma chamada de fallback, retornamos erro para que o cliente possa tentar novamente usando o mock
      if (!isFallback) {
        return res.status(500).json({ 
          error: 'Erro na API do Hugging Face',
          message: aiError instanceof Error ? aiError.message : 'Erro desconhecido',
          shouldUseFallback: true
        });
      }
      
      // Se for uma chamada de fallback, isso indica que mesmo o fallback falhou, então retornamos um erro fatal
      return res.status(500).json({ 
        error: 'Erro fatal na geração do treino',
        message: 'Tanto a API real quanto o fallback falharam',
        shouldUseFallback: false
      });
    }
  } catch (error) {
    console.error("Erro ao processar requisição:", error);
    
    // Em caso de erro, retorna uma resposta de erro
    return res.status(500).json({ 
      error: 'Erro ao gerar treino',
      message: error instanceof Error ? error.message : 'Erro desconhecido'
    });
  }
} 