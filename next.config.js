/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  env: {
    // As variáveis definidas aqui serão disponíveis no cliente e no servidor
    // Mas é recomendável usar o método automático do Next.js com NEXT_PUBLIC_ prefix
    // para as variáveis que devem ser expostas ao cliente
  },
  // Configurações adicionais se necessário
  images: {
    domains: [''],
  }
};

module.exports = nextConfig; 