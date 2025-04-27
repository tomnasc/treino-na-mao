-- Criar tabela para histórico de edições de exercícios
CREATE TABLE IF NOT EXISTS treino_4aivzd_exercise_edit_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  exercise_id UUID NOT NULL REFERENCES treino_4aivzd_exercises(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES treino_4aivzd_users(id) ON DELETE SET NULL,
  user_name TEXT,
  action TEXT NOT NULL CHECK (action IN ('create', 'update', 'delete')),
  timestamp TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  changes JSONB
);

-- Criar índice para pesquisas eficientes
CREATE INDEX IF NOT EXISTS idx_exercise_edit_history_exercise_id ON treino_4aivzd_exercise_edit_history(exercise_id);
CREATE INDEX IF NOT EXISTS idx_exercise_edit_history_user_id ON treino_4aivzd_exercise_edit_history(user_id);
CREATE INDEX IF NOT EXISTS idx_exercise_edit_history_timestamp ON treino_4aivzd_exercise_edit_history(timestamp);

-- Habilitar Row Level Security na tabela de histórico
ALTER TABLE treino_4aivzd_exercise_edit_history ENABLE ROW LEVEL SECURITY;

-- Permitir que todos os usuários vejam o histórico de edições
CREATE POLICY exercise_edit_history_select_policy ON treino_4aivzd_exercise_edit_history
  FOR SELECT USING (true);

-- Apenas o proprietário do exercício e administradores podem inserir, atualizar ou excluir
-- Criar política para treino_4aivzd_exercises para restringir exclusão
DO $$
BEGIN
    -- Verificar se a política já existe
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exercises_delete_policy' AND tablename = 'treino_4aivzd_exercises') THEN
        -- Criar política para permitir apenas criadores e admins excluírem exercícios
        EXECUTE 'CREATE POLICY exercises_delete_policy ON treino_4aivzd_exercises 
                 FOR DELETE USING (
                    created_by = auth.uid() OR 
                    (SELECT role FROM treino_4aivzd_users WHERE id = auth.uid()) = ''admin''
                 )';
    END IF;
    
    -- Verificar se a política de atualização já existe
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exercises_update_policy' AND tablename = 'treino_4aivzd_exercises') THEN
        -- Criar política para permitir que qualquer usuário possa atualizar exercícios
        -- Não restringimos atualizações, mas registramos quem as fez
        EXECUTE 'CREATE POLICY exercises_update_policy ON treino_4aivzd_exercises 
                 FOR UPDATE USING (true)';
    END IF;
    
    -- Verificar se a política de seleção já existe
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exercises_select_policy' AND tablename = 'treino_4aivzd_exercises') THEN
        -- Criar política para permitir que qualquer um possa ver exercícios
        EXECUTE 'CREATE POLICY exercises_select_policy ON treino_4aivzd_exercises 
                 FOR SELECT USING (true)';
    END IF;
    
    -- Verificar se a política de inserção já existe
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'exercises_insert_policy' AND tablename = 'treino_4aivzd_exercises') THEN
        -- Criar política para permitir que qualquer usuário possa criar exercícios
        EXECUTE 'CREATE POLICY exercises_insert_policy ON treino_4aivzd_exercises 
                 FOR INSERT WITH CHECK (true)';
    END IF;
END
$$;

-- Criar função trigger para registrar automaticamente alterações nos exercícios
CREATE OR REPLACE FUNCTION log_exercise_edit()
RETURNS TRIGGER AS $$
DECLARE
    action_type TEXT;
    user_fullname TEXT;
    changes_json JSONB;
BEGIN
    -- Determinar o tipo de ação
    IF TG_OP = 'INSERT' THEN
        action_type := 'create';
        changes_json := to_jsonb(NEW);
    ELSIF TG_OP = 'UPDATE' THEN
        action_type := 'update';
        -- Registrar apenas os campos que mudaram
        changes_json := jsonb_build_object();
        IF OLD.name <> NEW.name THEN 
            changes_json := changes_json || jsonb_build_object('name', jsonb_build_object('old', OLD.name, 'new', NEW.name));
        END IF;
        IF OLD.description IS DISTINCT FROM NEW.description THEN 
            changes_json := changes_json || jsonb_build_object('description', jsonb_build_object('old', OLD.description, 'new', NEW.description));
        END IF;
        IF OLD.muscle_groups IS DISTINCT FROM NEW.muscle_groups THEN 
            changes_json := changes_json || jsonb_build_object('muscle_groups', jsonb_build_object('old', OLD.muscle_groups, 'new', NEW.muscle_groups));
        END IF;
        IF OLD.equipment IS DISTINCT FROM NEW.equipment THEN 
            changes_json := changes_json || jsonb_build_object('equipment', jsonb_build_object('old', OLD.equipment, 'new', NEW.equipment));
        END IF;
        IF OLD.category <> NEW.category THEN 
            changes_json := changes_json || jsonb_build_object('category', jsonb_build_object('old', OLD.category, 'new', NEW.category));
        END IF;
        IF OLD.difficulty <> NEW.difficulty THEN 
            changes_json := changes_json || jsonb_build_object('difficulty', jsonb_build_object('old', OLD.difficulty, 'new', NEW.difficulty));
        END IF;
        IF OLD.youtube_video_id IS DISTINCT FROM NEW.youtube_video_id THEN 
            changes_json := changes_json || jsonb_build_object('youtube_video_id', jsonb_build_object('old', OLD.youtube_video_id, 'new', NEW.youtube_video_id));
        END IF;
        IF OLD.thumbnail_url IS DISTINCT FROM NEW.thumbnail_url THEN 
            changes_json := changes_json || jsonb_build_object('thumbnail_url', jsonb_build_object('old', OLD.thumbnail_url, 'new', NEW.thumbnail_url));
        END IF;
        IF OLD.is_verified <> NEW.is_verified THEN 
            changes_json := changes_json || jsonb_build_object('is_verified', jsonb_build_object('old', OLD.is_verified, 'new', NEW.is_verified));
        END IF;
    ELSE -- DELETE
        action_type := 'delete';
        changes_json := to_jsonb(OLD);
    END IF;

    -- Obter o nome do usuário
    SELECT full_name INTO user_fullname 
    FROM treino_4aivzd_users 
    WHERE id = auth.uid();

    -- Inserir registro no histórico
    INSERT INTO treino_4aivzd_exercise_edit_history (
        exercise_id,
        user_id,
        user_name,
        action,
        timestamp,
        changes
    ) VALUES (
        CASE 
            WHEN TG_OP = 'DELETE' THEN OLD.id
            ELSE NEW.id
        END,
        auth.uid(),
        user_fullname,
        action_type,
        NOW(),
        changes_json
    );

    -- Retornar o valor apropriado com base na operação
    IF TG_OP = 'DELETE' THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adicionar triggers nas operações de exercício
DROP TRIGGER IF EXISTS exercise_insert_trigger ON treino_4aivzd_exercises;
DROP TRIGGER IF EXISTS exercise_update_trigger ON treino_4aivzd_exercises;
DROP TRIGGER IF EXISTS exercise_delete_trigger ON treino_4aivzd_exercises;

CREATE TRIGGER exercise_insert_trigger
AFTER INSERT ON treino_4aivzd_exercises
FOR EACH ROW EXECUTE FUNCTION log_exercise_edit();

CREATE TRIGGER exercise_update_trigger
AFTER UPDATE ON treino_4aivzd_exercises
FOR EACH ROW EXECUTE FUNCTION log_exercise_edit();

CREATE TRIGGER exercise_delete_trigger
BEFORE DELETE ON treino_4aivzd_exercises
FOR EACH ROW EXECUTE FUNCTION log_exercise_edit(); 