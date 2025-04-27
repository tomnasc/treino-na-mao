-- Este script deve ser executado manualmente no Console SQL do Supabase
-- Ele cria uma função RPC que pode executar SQL dinamicamente

-- Criar função exec_sql que permite executar SQL dinamicamente
-- IMPORTANTE: Esta função deve ser usada com cautela, pois permite executar qualquer SQL
CREATE OR REPLACE FUNCTION exec_sql(sql text)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER -- Executa com privilégios do criador da função
AS $$
BEGIN
  -- Registrar a chamada para fins de auditoria
  INSERT INTO audit_log(action, details)
  VALUES ('exec_sql', json_build_object('sql', sql, 'user_id', auth.uid()));
  
  -- Executar o SQL dinâmico
  EXECUTE sql;
  
  -- Retornar sucesso
  RETURN json_build_object('success', true);
EXCEPTION WHEN OTHERS THEN
  -- Em caso de erro, retornar detalhes
  RETURN json_build_object(
    'success', false,
    'error', SQLERRM,
    'code', SQLSTATE
  );
END;
$$;

-- Criar tabela de auditoria para registrar execuções de SQL dinâmico
CREATE TABLE IF NOT EXISTS audit_log (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action TEXT NOT NULL,
  details JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  user_id UUID
);

-- Comentário para documentar o propósito da função
COMMENT ON FUNCTION exec_sql(text) IS 'Executa SQL dinamicamente. Use com extrema cautela.';

-- Conceder permissão para usuários autenticados
GRANT EXECUTE ON FUNCTION exec_sql(text) TO authenticated;

-- Alternativamente, se você não quiser criar uma função RPC,
-- pode adicionar manualmente a extensão e a tabela via SQL console:

-- Habilitar extensão uuid-ossp
-- CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela de todos manualmente
-- CREATE TABLE IF NOT EXISTS treino_4aivzd_todos (
--   id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
--   user_id UUID NOT NULL,
--   text TEXT NOT NULL,
--   category TEXT NOT NULL,
--   completed BOOLEAN NOT NULL DEFAULT FALSE,
--   created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
--   updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
-- );

-- Configurar políticas RLS
-- ALTER TABLE treino_4aivzd_todos ENABLE ROW LEVEL SECURITY;
-- CREATE POLICY todos_select_policy ON treino_4aivzd_todos
--   FOR SELECT USING (user_id = auth.uid());
-- CREATE POLICY todos_insert_policy ON treino_4aivzd_todos
--   FOR INSERT WITH CHECK (user_id = auth.uid());
-- CREATE POLICY todos_update_policy ON treino_4aivzd_todos
--   FOR UPDATE USING (user_id = auth.uid());
-- CREATE POLICY todos_delete_policy ON treino_4aivzd_todos
--   FOR DELETE USING (user_id = auth.uid()); 