# Migrações de Banco de Dados

Este diretório contém os scripts de migração para o banco de dados do projeto Treino na Mão.

## Como executar uma migração

1. Certifique-se de ter as variáveis de ambiente configuradas no arquivo `.env`:

```
SUPABASE_URL=https://sua-instancia.supabase.co
SUPABASE_SERVICE_KEY=sua-chave-de-servico-com-permissoes-administrativas
```

2. Execute o script de migração:

```bash
# Instalar dependências se necessário
npm install

# Executar o script para a migração específica
node scripts/run-migration.js add_order_column.sql
```

## Migrações disponíveis

### add_order_column.sql

Adiciona a coluna `order` à tabela `treino_4aivzd_workouts`, permitindo a reordenação de treinos.

**Operações:**
- Adiciona a coluna `order` do tipo INTEGER
- Popula a coluna com valores iniciais baseados na data de criação
- Cria um índice para melhorar o desempenho
- Define o valor padrão para novos registros

**Importante:** Após executar esta migração, a aplicação poderá usar a funcionalidade de reordenação de treinos que persistirá no banco de dados. 