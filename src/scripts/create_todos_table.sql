-- Script para criar a tabela de tarefas (todos)

-- Habilitar a extensão uuid-ossp para gerar UUIDs
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS treino_4aivzd_todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Adicionar índices para melhorar a performance
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON treino_4aivzd_todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON treino_4aivzd_todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_category ON treino_4aivzd_todos(category);

-- Configurar RLS (Row Level Security) para garantir que os usuários só vejam suas próprias tarefas
ALTER TABLE treino_4aivzd_todos ENABLE ROW LEVEL SECURITY;

-- Política para permitir que usuários vejam apenas suas próprias tarefas
DROP POLICY IF EXISTS todos_select_policy ON treino_4aivzd_todos;
CREATE POLICY todos_select_policy ON treino_4aivzd_todos
  FOR SELECT USING (user_id = auth.uid());

-- Política para permitir que usuários criem suas próprias tarefas
DROP POLICY IF EXISTS todos_insert_policy ON treino_4aivzd_todos;
CREATE POLICY todos_insert_policy ON treino_4aivzd_todos
  FOR INSERT WITH CHECK (user_id = auth.uid());

-- Política para permitir que usuários atualizem apenas suas próprias tarefas
DROP POLICY IF EXISTS todos_update_policy ON treino_4aivzd_todos;
CREATE POLICY todos_update_policy ON treino_4aivzd_todos
  FOR UPDATE USING (user_id = auth.uid());

-- Política para permitir que usuários excluam apenas suas próprias tarefas
DROP POLICY IF EXISTS todos_delete_policy ON treino_4aivzd_todos;
CREATE POLICY todos_delete_policy ON treino_4aivzd_todos
  FOR DELETE USING (user_id = auth.uid());

-- Trigger para atualizar o campo updated_at automaticamente
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_updated_at ON treino_4aivzd_todos;
CREATE TRIGGER set_updated_at
BEFORE UPDATE ON treino_4aivzd_todos
FOR EACH ROW
EXECUTE FUNCTION update_updated_at();

-- Comentários para documentação da tabela
COMMENT ON TABLE treino_4aivzd_todos IS 'Tabela de tarefas (todos) para o aplicativo Treino na Mão';
COMMENT ON COLUMN treino_4aivzd_todos.id IS 'Identificador único da tarefa';
COMMENT ON COLUMN treino_4aivzd_todos.user_id IS 'ID do usuário proprietário da tarefa';
COMMENT ON COLUMN treino_4aivzd_todos.text IS 'Texto descritivo da tarefa';
COMMENT ON COLUMN treino_4aivzd_todos.category IS 'Categoria da tarefa (personal, workout, diet, custom)';
COMMENT ON COLUMN treino_4aivzd_todos.completed IS 'Indica se a tarefa foi concluída';
COMMENT ON COLUMN treino_4aivzd_todos.created_at IS 'Data e hora de criação da tarefa';
COMMENT ON COLUMN treino_4aivzd_todos.updated_at IS 'Data e hora da última atualização da tarefa'; 