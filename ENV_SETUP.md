# Configuração de Variáveis de Ambiente

Para o funcionamento correto da aplicação Treino na Mão, é necessário configurar as variáveis de ambiente adequadamente. Este guia explica como fazer essa configuração.

## Arquivo .env

O projeto utiliza um arquivo `.env` na raiz para armazenar as variáveis de ambiente. Um arquivo `.env` já foi criado com valores de exemplo, mas você precisa substituí-los por valores reais.

### Variáveis necessárias

```
# API Keys
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url_here
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key_here

# Hugging Face Integration
HUGGING_FACE_API_TOKEN=your_huggingface_api_token_here

# API Configuration
NEXT_PUBLIC_API_URL=http://localhost:3000/api
```

## Como obter os valores

### Supabase
1. Crie uma conta no [Supabase](https://supabase.io/)
2. Crie um novo projeto
3. No painel do projeto, vá para Configurações > API
4. Copie a URL do projeto e a chave anônima (anon key)

### Hugging Face
1. Crie uma conta no [Hugging Face](https://huggingface.co/)
2. Vá para Configurações > Tokens de Acesso
3. Crie um novo token com permissões de leitura
4. Copie o token gerado

## Testando a configuração

Após configurar o arquivo `.env`, reinicie o servidor de desenvolvimento para que as novas variáveis sejam carregadas:

```bash
npm run dev
```

Você pode verificar se a integração com o Hugging Face está funcionando corretamente acessando a página de geração de treinos com IA no aplicativo.

## Solução de problemas

Se você estiver enfrentando erros relacionados a variáveis de ambiente:

1. Verifique se o arquivo `.env` está na raiz do projeto
2. Confirme se os nomes das variáveis estão escritos corretamente
3. Reinicie o servidor após fazer alterações no arquivo `.env`
4. Verifique nos logs do servidor se há mensagens de erro relacionadas às variáveis de ambiente

### Erro "process.env não definido"

Se estiver encontrando erros como "process.env is not defined" no cliente, lembre-se que apenas variáveis com prefixo `NEXT_PUBLIC_` estão disponíveis no navegador. Para as demais, é necessário acessá-las apenas no servidor.

# Configuração das Variáveis de Ambiente

Este documento descreve as variáveis de ambiente necessárias para executar o projeto Treino na Mão.

## Supabase

Para configurar a conexão com o Supabase, você precisa definir as seguintes variáveis:

### VITE_SUPABASE_URL

URL da sua instância do Supabase.

Como obter:
1. Acesse o [Dashboard do Supabase](https://app.supabase.io)
2. Selecione seu projeto
3. Vá para Configurações > API
4. Copie a "URL do Projeto"

### VITE_SUPABASE_ANON_KEY

Chave anônima para autenticação com o Supabase.

Como obter:
1. Acesse o [Dashboard do Supabase](https://app.supabase.io)
2. Selecione seu projeto
3. Vá para Configurações > API
4. Copie a "anon public" ou "chave anônima"

⚠️ **IMPORTANTE**: Nunca compartilhe suas chaves ou adicione-as diretamente no código-fonte. Use sempre o arquivo `.env` que está no `.gitignore` para evitar que as chaves sejam adicionadas ao controle de versão.

## Outras Variáveis

### VITE_APP_TITLE
Título da aplicação que aparece na interface do usuário e na aba do navegador.

## Como Configurar

1. Copie o arquivo `.env.example` para um novo arquivo chamado `.env`:
   ```
   cp .env.example .env
   ```
2. Edite o arquivo `.env` e preencha as variáveis com seus valores reais.
3. Reinicie o servidor de desenvolvimento para aplicar as alterações:
   ```
   npm run dev
   ```

Estas variáveis estarão disponíveis em seu código através de `import.meta.env.NOME_DA_VARIAVEL`. 