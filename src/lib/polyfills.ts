/**
 * Polyfills para funcionalidades que podem não estar disponíveis em todos os ambientes
 */

import { v4 as uuidv4 } from 'uuid';

// Polyfill para crypto.randomUUID()
if (typeof window !== 'undefined' && typeof crypto !== 'undefined') {
  if (!crypto.randomUUID) {
    // @ts-ignore - Adicionando randomUUID ao objeto crypto
    crypto.randomUUID = () => uuidv4();
  }
}

// Polyfill global para ambientes onde crypto não está disponível (como Node.js em alguns contextos)
if (typeof globalThis !== 'undefined' && !globalThis.crypto) {
  // @ts-ignore - Adicionando objeto crypto global com tipagem explícita
  globalThis.crypto = {
    // @ts-ignore - Ignorando incompatibilidade de tipo
    randomUUID: () => uuidv4(),
    // Adicione outras propriedades do crypto conforme necessário
  };
}

export {}; // Necessário para que este arquivo seja tratado como um módulo 