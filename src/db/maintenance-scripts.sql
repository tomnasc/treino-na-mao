-- Script de manutenção para limpar sessões antigas e duplicadas

-- 1. Função para limpar sessões de treino abandonadas e antigas
CREATE OR REPLACE FUNCTION cleanup_stale_workout_sessions()
RETURNS void AS $$
BEGIN
  -- Marcar como abandonadas todas as sessões em andamento que começaram há mais de 24 horas
  UPDATE treino_4aivzd_workout_sessions
  SET status = 'abandoned',
      updated_at = NOW()
  WHERE status = 'in_progress'
    AND started_at < NOW() - INTERVAL '24 hours';
    
  -- Limitar o número de sessões abandonadas por usuário (manter apenas as 20 mais recentes)
  WITH old_abandoned_sessions AS (
    SELECT id
    FROM (
      SELECT 
        id,
        user_id,
        ROW_NUMBER() OVER (PARTITION BY user_id ORDER BY started_at DESC) as rn
      FROM treino_4aivzd_workout_sessions
      WHERE status = 'abandoned'
    ) ranked
    WHERE rn > 20
  )
  DELETE FROM treino_4aivzd_workout_sessions
  WHERE id IN (SELECT id FROM old_abandoned_sessions);
  
  -- Limpar logs de exercícios órfãos (sem sessão associada)
  DELETE FROM treino_4aivzd_exercise_logs
  WHERE workout_session_id NOT IN (
    SELECT id FROM treino_4aivzd_workout_sessions
  );
END;
$$ LANGUAGE plpgsql;

-- Comentário explicativo para a função
COMMENT ON FUNCTION cleanup_stale_workout_sessions() IS 'Limpa sessões de treino em andamento antigas (>24h) e mantém apenas as 20 sessões abandonadas mais recentes por usuário';

-- 2. Configurar um job para execução automática (uma vez por dia)
-- Para PostgreSQL v12+, se os privilégios permitirem:

/*
CREATE EXTENSION IF NOT EXISTS pg_cron;

SELECT cron.schedule(
  'cleanup-stale-workout-sessions',
  '0 3 * * *',  -- Executa às 3:00 AM todos os dias
  $$SELECT cleanup_stale_workout_sessions()$$
);
*/

-- Observação: A extensão pg_cron requer privilégios de administrador e pode não estar 
-- disponível em todos os ambientes Supabase. Se não estiver disponível, considere
-- executar esta função periodicamente através de uma função serverless ou similar.

-- 3. Instruções para uso manual:
/*
   Para limpar sessões manualmente, execute:
   
   SELECT cleanup_stale_workout_sessions();
   
   Isso pode ser feito periodicamente através do SQL Editor do Supabase
   ou chamado através de uma API REST.
*/ 