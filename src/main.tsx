// Importar polyfills antes de qualquer outro código
import './lib/polyfills';

import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { setupMockServer } from './api/server';

// Inicializar o servidor mock para desenvolvimento
// Utilizando import.meta.env conforme definido em vite-env.d.ts
if (import.meta.env.DEV) {
  setupMockServer();
  console.log('🔶 Servidor mock inicializado!');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)