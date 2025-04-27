# Treino na Mão - Aplicativo de Gerenciamento de Treinos

Treino na Mão é um aplicativo web responsivo para gerenciamento de treinos de academia, que permite aos usuários criar, acompanhar e analisar seus treinos de forma intuitiva. O aplicativo incorpora inteligência artificial para oferecer sugestões de treino personalizadas.

## Principais Funcionalidades

- Autenticação de usuários
- Gerenciamento de treinos personalizados
- Geração de treinos com IA usando a API do Hugging Face
- Modo de treino interativo com cronômetros
- Histórico e relatórios de desempenho
- Interface responsiva com modo escuro/claro

## Tecnologias Utilizadas

- **Frontend:** Next.js, React, TailwindCSS
- **Backend:** Supabase (PostgreSQL, Auth, Storage), Next.js API Routes
- **IA:** Hugging Face API (modelo Mistral-7B-Instruct)
- **Hospedagem:** Vercel

## Configuração do Ambiente

### Pré-requisitos

- Node.js (v18 ou superior)
- npm ou pnpm

### Instalação

1. Clone o repositório:
   ```bash
   git clone https://github.com/seu-usuario/treino-na-mao.git
   cd treino-na-mao
   ```

2. Instale as dependências:
   ```bash
   npm install
   # ou
   pnpm install
   ```

3. Configure as variáveis de ambiente:
   - Copie o arquivo `.env` com as variáveis necessárias
   - Consulte o arquivo `ENV_SETUP.md` para instruções detalhadas sobre como obter e configurar as variáveis de ambiente

4. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   # ou
   pnpm dev
   ```

5. Acesse o aplicativo em [http://localhost:3000](http://localhost:3000)

## Variáveis de Ambiente

O projeto requer as seguintes variáveis de ambiente:

```
# API Keys
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Hugging Face Integration
HUGGING_FACE_API_TOKEN=your_huggingface_api_token_here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

Consulte o arquivo `ENV_SETUP.md` para instruções detalhadas sobre como obter e configurar essas variáveis.

## Estrutura do Projeto

```
treino-na-mao/
├── src/
│   ├── components/    # Componentes reutilizáveis
│   ├── pages/         # Páginas da aplicação
│   │   └── api/       # Endpoints da API
│   ├── services/      # Serviços (API, autenticação)
│   ├── contexts/      # Contextos React
│   ├── hooks/         # Hooks personalizados
│   ├── types/         # Definições de tipos
│   └── styles/        # Estilos globais
├── public/            # Arquivos estáticos
└── scripts/           # Scripts utilitários
```

## Contribuição

Para contribuir com o projeto, siga estas etapas:

1. Faça um fork do repositório
2. Crie uma branch para sua feature (`git checkout -b feature/nova-feature`)
3. Faça commit das alterações (`git commit -m 'Adiciona nova feature'`)
4. Faça push para a branch (`git push origin feature/nova-feature`)
5. Abra um Pull Request
