import supabase from './supabase';
import { User } from '@supabase/supabase-js';

export interface TableInfo {
  exists: boolean;
  error?: any;
  message: string;
}

/**
 * Verifica se uma tabela existe no banco de dados do Supabase
 * @param tableName Nome da tabela para verificar
 * @returns Informações sobre a existência da tabela
 */
export async function checkTableExists(tableName: string): Promise<TableInfo> {
  try {
    // Usar uma consulta count simples para verificar se a tabela existe
    const { count, error } = await supabase
      .from(tableName)
      .select('*', { count: 'exact', head: true });
    
    // Se não houver erro, a tabela existe
    if (!error) {
      return {
        exists: true,
        message: `Tabela ${tableName} encontrada com ${count} registros`
      };
    }
    
    // Se o erro for de tabela não encontrada (código 42P01)
    if (error.code === '42P01') {
      return {
        exists: false,
        error,
        message: `Tabela ${tableName} não existe no banco de dados`
      };
    }
    
    // Outros erros (permissão, etc)
    return {
      exists: false,
      error,
      message: `Erro ao verificar tabela ${tableName}: ${error.message}`
    };
  } catch (error: any) {
    return {
      exists: false,
      error,
      message: `Erro ao executar verificação: ${error.message}`
    };
  }
}

interface DiagnosticResult {
  auth: { 
    success: boolean;
    user: User | null;
    error: any;
  };
  tables: { 
    todos: TableInfo;
  };
  connection: { 
    success: boolean;
    error: any;
  };
}

/**
 * Executa um diagnóstico completo da conexão com o Supabase
 * @returns Objeto contendo informações de diagnóstico
 */
export async function diagnoseSupabaseConnection(): Promise<DiagnosticResult> {
  const results: DiagnosticResult = {
    auth: { success: false, user: null, error: null },
    tables: { todos: { exists: false, message: '' } },
    connection: { success: false, error: null }
  };
  
  try {
    // Verificar autenticação
    const { data: authData, error: authError } = await supabase.auth.getUser();
    results.auth.success = !authError;
    results.auth.user = authData?.user || null;
    results.auth.error = authError;
    
    // Verificar tabela de todos
    const todoTableInfo = await checkTableExists('treino_4aivzd_todos');
    results.tables.todos = todoTableInfo;
    
    // Verificar conexão geral
    results.connection.success = true;
  } catch (error: any) {
    results.connection.success = false;
    results.connection.error = error.message;
  }
  
  return results;
}

/**
 * Converte um objeto de erro do Supabase em um formato mais amigável para depuração
 * @param error Objeto de erro do Supabase
 * @returns Objeto formatado com informações detalhadas do erro
 */
export function formatSupabaseError(error: any) {
  if (!error) return { message: 'Erro desconhecido' };
  
  return {
    code: error.code,
    message: error.message,
    details: error.details,
    hint: error.hint
  };
}

/**
 * Executa SQL diretamente no banco de dados
 * @param sql Comando SQL a ser executado
 * @returns Resultados da execução do SQL
 */
export async function executeSql(sql: string) {
  try {
    // Tentar executar o SQL via RPC
    const { data, error } = await supabase.rpc('exec_sql', { sql });
    
    if (error) {
      console.error('Erro ao executar SQL via RPC:', formatSupabaseError(error));
      return { success: false, error };
    }
    
    return { success: true, data };
  } catch (error) {
    console.error('Erro na execução do RPC:', error);
    return { success: false, error };
  }
}

/**
 * Cria a tabela de todos se ela não existir
 */
export async function createTodosTableIfNotExists() {
  // Primeiro verificar se a tabela existe
  const tableInfo = await checkTableExists('treino_4aivzd_todos');
  
  if (tableInfo.exists) {
    console.log('Tabela de todos já existe, pulando criação');
    return { success: true, message: 'A tabela já existe' };
  }
  
  console.log('Tabela de todos não encontrada, tentando criar...');
  
  // Tentar criar a tabela diretamente (método alternativo)
  try {
    // Primeiro, verificar se a função RPC exec_sql está disponível
    const rpcResult = await executeSql('SELECT 1');
    
    if (rpcResult.success) {
      console.log('Função RPC disponível, criando tabela via RPC');
      
      // Criar a extensão uuid-ossp se necessário
      const extensionSql = `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`;
      await executeSql(extensionSql);
      
      // Criar a tabela
      const createTableSql = `
        CREATE TABLE IF NOT EXISTS treino_4aivzd_todos (
          id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
          user_id UUID NOT NULL,
          text TEXT NOT NULL,
          category TEXT NOT NULL,
          completed BOOLEAN NOT NULL DEFAULT FALSE,
          created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
          updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
        );
      `;
      
      const result = await executeSql(createTableSql);
      
      if (!result.success) {
        return { 
          success: false, 
          message: 'Falha ao criar tabela de todos via RPC',
          error: result.error
        };
      }
      
      // Adicionar políticas RLS básicas
      const rlsSql = `
        ALTER TABLE treino_4aivzd_todos ENABLE ROW LEVEL SECURITY;
        
        DROP POLICY IF EXISTS todos_select_policy ON treino_4aivzd_todos;
        CREATE POLICY todos_select_policy ON treino_4aivzd_todos
          FOR SELECT USING (user_id = auth.uid());
        
        DROP POLICY IF EXISTS todos_insert_policy ON treino_4aivzd_todos;
        CREATE POLICY todos_insert_policy ON treino_4aivzd_todos
          FOR INSERT WITH CHECK (user_id = auth.uid());
        
        DROP POLICY IF EXISTS todos_update_policy ON treino_4aivzd_todos;
        CREATE POLICY todos_update_policy ON treino_4aivzd_todos
          FOR UPDATE USING (user_id = auth.uid());
        
        DROP POLICY IF EXISTS todos_delete_policy ON treino_4aivzd_todos;
        CREATE POLICY todos_delete_policy ON treino_4aivzd_todos
          FOR DELETE USING (user_id = auth.uid());
      `;
      
      await executeSql(rlsSql);
      
      return { success: true, message: 'Tabela de todos criada com sucesso via RPC' };
    } else {
      console.log('Função RPC não disponível, tentando SQL direto');
      
      // Se RPC não está disponível, exibir instruções para criar manualmente
      return { 
        success: false, 
        needsManualCreation: true,
        message: `Não foi possível criar a tabela automaticamente. A função RPC 'exec_sql' não está disponível. 
        Por favor, execute o script SQL 'create_todos_table.sql' manualmente no Console SQL do Supabase.`
      };
    }
  } catch (error: any) {
    console.error('Erro ao criar tabela:', error);
    
    return { 
      success: false, 
      message: `Erro ao criar tabela: ${error.message}`,
      error
    };
  }
} 