// Mock endpoint para verificação de status da API de IA

/**
 * Este é um endpoint de substituição que foi criado apenas para evitar erros 404.
 * Toda a funcionalidade de IA foi removida do sistema, mas este arquivo é mantido
 * para manter compatibilidade com qualquer código que ainda possa fazer referência a ele.
 */

// Função que simula a resposta do servidor
export default function handler(req: any, res: any) {
  // Retornar uma resposta 200 com um objeto vazio
  res.status(200).json({
    success: false,
    message: "A funcionalidade de IA foi removida do sistema",
    status: "disabled"
  });
} 