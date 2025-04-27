-- Adicionar a coluna 'order' à tabela de treinos
ALTER TABLE treino_4aivzd_workouts ADD COLUMN "order" INTEGER DEFAULT NULL;

-- Popula a coluna 'order' com valores sequenciais agrupados por usuário
-- (treinos mais recentes primeiro, para manter a mesma lógica atual)
WITH ordered_workouts AS (
  SELECT 
    id, 
    user_id,
    ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY created_at DESC) - 1 as row_num
  FROM treino_4aivzd_workouts
)
UPDATE treino_4aivzd_workouts AS w
SET "order" = ow.row_num
FROM ordered_workouts AS ow
WHERE w.id = ow.id;

-- Adicionar um índice para melhorar o desempenho das consultas ordenadas
CREATE INDEX idx_workouts_user_order ON treino_4aivzd_workouts (user_id, "order");

-- Definir valor padrão para novos registros
ALTER TABLE treino_4aivzd_workouts ALTER COLUMN "order" SET DEFAULT 0; 