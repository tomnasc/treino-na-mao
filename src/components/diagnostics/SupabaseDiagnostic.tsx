import React, { useState, useEffect } from 'react';
import { diagnoseSupabaseConnection, createTodosTableIfNotExists } from '../../lib/database';
import { Alert, AlertDescription, AlertTitle } from '../ui/alert';
import { Button } from '../ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '../ui/card';
import { CheckCircle, XCircle, AlertTriangle, Database, Loader2 } from 'lucide-react';

const SupabaseDiagnostic: React.FC = () => {
  const [isRunning, setIsRunning] = useState(false);
  const [results, setResults] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);
  const [isCreatingTable, setIsCreatingTable] = useState(false);
  const [createTableResult, setCreateTableResult] = useState<any>(null);
  
  const runDiagnostic = async () => {
    setIsRunning(true);
    setError(null);
    setCreateTableResult(null);
    
    try {
      const diagnosticResults = await diagnoseSupabaseConnection();
      setResults(diagnosticResults);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsRunning(false);
    }
  };

  const handleCreateTable = async () => {
    setIsCreatingTable(true);
    setCreateTableResult(null);
    
    try {
      const result = await createTodosTableIfNotExists();
      setCreateTableResult(result);
      
      if (result.success) {
        // Se a tabela foi criada com sucesso, executa o diagnóstico novamente
        await runDiagnostic();
      }
    } catch (err: any) {
      setCreateTableResult({
        success: false,
        message: `Falha ao criar tabela: ${err.message}`,
        error: err
      });
    } finally {
      setIsCreatingTable(false);
    }
  };
  
  useEffect(() => {
    // Executar diagnóstico automaticamente na primeira vez
    runDiagnostic();
  }, []);
  
  if (error) {
    return (
      <Alert variant="destructive">
        <AlertTriangle className="h-4 w-4" />
        <AlertTitle>Erro ao executar diagnóstico</AlertTitle>
        <AlertDescription>{error}</AlertDescription>
        <Button onClick={runDiagnostic} variant="outline" size="sm" className="mt-2">
          Tentar novamente
        </Button>
      </Alert>
    );
  }
  
  if (!results) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Diagnóstico do Supabase</CardTitle>
          <CardDescription>Verificando conexão com o banco de dados...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center p-6">
            <div className="animate-spin h-8 w-8 border-4 border-primary rounded-full border-t-transparent"></div>
          </div>
        </CardContent>
      </Card>
    );
  }
  
  const { auth, tables, connection } = results;
  
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center">
          <Database className="mr-2 h-5 w-5" />
          Diagnóstico do Supabase
        </CardTitle>
        <CardDescription>
          Resultados da verificação de conectividade com o banco de dados
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Verificação de conexão */}
          <div className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center">
              {connection.success ? 
                <CheckCircle className="text-green-500 mr-2 h-5 w-5" /> : 
                <XCircle className="text-red-500 mr-2 h-5 w-5" />
              }
              <span>Conexão com Supabase</span>
            </div>
            <span className={connection.success ? "text-green-500" : "text-red-500"}>
              {connection.success ? "OK" : "Falha"}
            </span>
          </div>
          
          {/* Verificação de autenticação */}
          <div className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center">
              {auth.success ? 
                <CheckCircle className="text-green-500 mr-2 h-5 w-5" /> : 
                <XCircle className="text-red-500 mr-2 h-5 w-5" />
              }
              <span>Autenticação</span>
            </div>
            <span className={auth.success ? "text-green-500" : "text-red-500"}>
              {auth.success ? "Autenticado" : "Não autenticado"}
            </span>
          </div>
          
          {/* Verificação da tabela de todos */}
          <div className="flex items-center justify-between p-2 border rounded">
            <div className="flex items-center">
              {tables.todos.exists ? 
                <CheckCircle className="text-green-500 mr-2 h-5 w-5" /> : 
                <XCircle className="text-red-500 mr-2 h-5 w-5" />
              }
              <span>Tabela de Tarefas</span>
            </div>
            <div className="flex items-center">
              <span className={tables.todos.exists ? "text-green-500 mr-2" : "text-red-500 mr-2"}>
                {tables.todos.exists ? "Disponível" : "Indisponível"}
              </span>
              {!tables.todos.exists && (
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={handleCreateTable} 
                  disabled={isCreatingTable}
                >
                  {isCreatingTable ? (
                    <>
                      <Loader2 className="mr-1 h-3 w-3 animate-spin" />
                      Criando...
                    </>
                  ) : (
                    "Criar tabela"
                  )}
                </Button>
              )}
            </div>
          </div>
          
          {/* Resultado da criação da tabela */}
          {createTableResult && (
            <Alert variant={createTableResult.success ? "default" : "destructive"} className="mt-2">
              {createTableResult.success ? (
                <CheckCircle className="h-4 w-4 text-green-500" />
              ) : (
                <AlertTriangle className="h-4 w-4" />
              )}
              <AlertTitle>{createTableResult.success ? "Sucesso" : "Erro"}</AlertTitle>
              <AlertDescription>
                {createTableResult.message}
                
                {/* Exibir instruções para criação manual se necessário */}
                {createTableResult.needsManualCreation && (
                  <div className="mt-2 p-2 bg-background border rounded">
                    <p className="font-medium">Instruções para criação manual da tabela:</p>
                    <ol className="list-decimal list-inside mt-1 text-sm space-y-1">
                      <li>Acesse o Dashboard do Supabase</li>
                      <li>Vá para "SQL Editor"</li>
                      <li>Cole o seguinte código SQL:</li>
                      <pre className="my-2 p-2 bg-muted text-xs overflow-x-auto rounded">
                        {`-- Habilitar extensão uuid-ossp
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Criar tabela de todos
CREATE TABLE IF NOT EXISTS treino_4aivzd_todos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL,
  text TEXT NOT NULL,
  category TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Configurar políticas RLS
ALTER TABLE treino_4aivzd_todos ENABLE ROW LEVEL SECURITY;
CREATE POLICY todos_select_policy ON treino_4aivzd_todos
  FOR SELECT USING (user_id = auth.uid());
CREATE POLICY todos_insert_policy ON treino_4aivzd_todos
  FOR INSERT WITH CHECK (user_id = auth.uid());
CREATE POLICY todos_update_policy ON treino_4aivzd_todos
  FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY todos_delete_policy ON treino_4aivzd_todos
  FOR DELETE USING (user_id = auth.uid());`}
                      </pre>
                      <li>Execute o código</li>
                      <li>Volte aqui e clique em "Executar novamente" para verificar</li>
                    </ol>
                  </div>
                )}
              </AlertDescription>
            </Alert>
          )}
          
          {/* Detalhes de erro */}
          {(!connection.success || !auth.success || !tables.todos.exists) && (
            <Alert variant="destructive" className="mt-4">
              <AlertTriangle className="h-4 w-4" />
              <AlertTitle>Problemas detectados</AlertTitle>
              <AlertDescription className="space-y-2">
                {!connection.success && (
                  <p><strong>Erro de conexão:</strong> {connection.error}</p>
                )}
                {!auth.success && auth.error && (
                  <p><strong>Erro de autenticação:</strong> {auth.error.message}</p>
                )}
                {!tables.todos.exists && (
                  <p><strong>Erro na tabela:</strong> {tables.todos.message}</p>
                )}
                <p className="text-sm mt-2">
                  Para resolver: Verifique a conexão com a internet, suas credenciais 
                  de acesso ao Supabase e certifique-se de que a tabela está criada
                  no banco de dados.
                </p>
              </AlertDescription>
            </Alert>
          )}
        </div>
      </CardContent>
      <CardFooter>
        <Button 
          onClick={runDiagnostic}
          disabled={isRunning}
          className="w-full"
        >
          {isRunning ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Executando...
            </>
          ) : (
            'Executar novamente'
          )}
        </Button>
      </CardFooter>
    </Card>
  );
};

export default SupabaseDiagnostic; 