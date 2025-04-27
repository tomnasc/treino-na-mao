// src/pages/TodoPage.tsx
import React, { useState, useEffect } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from 'uuid';

import PageLayout from "../components/layout/PageLayout";
import { useAuth } from "../contexts/AuthContext";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "../components/ui/card";
import { Button } from "../components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Checkbox } from "../components/ui/checkbox";
import { Input } from "../components/ui/input";
import { PlusCircle, Trash2, Database, AlertTriangle } from "lucide-react";
import supabase from "../lib/supabase";
import { diagnoseSupabaseConnection, formatSupabaseError } from "../lib/database";
import { TodoCategory, TodoItem } from "../types";
import SupabaseDiagnostic from "../components/diagnostics/SupabaseDiagnostic";

const TodoPage: React.FC = () => {
  const { user } = useAuth();
  const [todos, setTodos] = useState<{[key in TodoCategory]: TodoItem[]}>({
    [TodoCategory.Personal]: [],
    [TodoCategory.Workout]: [],
    [TodoCategory.Diet]: [],
    [TodoCategory.Custom]: []
  });
  
  const [newTodoText, setNewTodoText] = useState("");
  const [selectedCategory, setSelectedCategory] = useState<TodoCategory>(TodoCategory.Personal);
  const [isLoading, setIsLoading] = useState(true);
  const [connectionError, setConnectionError] = useState<string | null>(null);
  const [showDiagnostic, setShowDiagnostic] = useState(false);

  // Carregar tarefas do usuário
  useEffect(() => {
    if (!user) return;
    
    const loadTodos = async () => {
      setIsLoading(true);
      setConnectionError(null);
      try {
        console.log('Carregando tarefas para o usuário:', user.id);
        
        // Executar diagnóstico do Supabase primeiro
        const diagnostics = await diagnoseSupabaseConnection();
        console.log('Diagnóstico do Supabase:', diagnostics);
        
        // Verificar autenticação
        if (!diagnostics.auth.success) {
          const errorMsg = `Erro de autenticação: ${diagnostics.auth.error?.message || 'Usuário não autenticado'}`;
          setConnectionError(errorMsg);
          throw new Error(errorMsg);
        }
        
        // Verificar se a tabela existe e tentar criá-la se não existir
        if (!diagnostics.tables.todos.exists) {
          console.warn(diagnostics.tables.todos.message);
          console.log('Tentando criar a tabela de todos automaticamente...');
          
          try {
            const { createTodosTableIfNotExists } = await import('../lib/database');
            const result = await createTodosTableIfNotExists();
            
            if (!result.success) {
              console.error('Falha ao criar tabela automaticamente:', result.message);
              // Continuamos mesmo assim para tentar usar os dados mock
            } else {
              console.log('Tabela criada com sucesso:', result.message);
            }
          } catch (tableError) {
            console.error('Erro ao criar tabela:', tableError);
          }
        }
        
        // Tentar buscar tarefas
        const { data, error } = await supabase
          .from('treino_4aivzd_todos')
          .select('*')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        // Se houver erro, registrá-lo detalhadamente
        if (error) {
          console.error('Erro detalhado ao buscar tarefas:', formatSupabaseError(error));
          const errorMsg = `Erro ao buscar tarefas: ${error.message}`;
          setConnectionError(errorMsg);
          throw new Error(errorMsg);
        }
        
        console.log('Tarefas carregadas com sucesso:', data?.length || 0, 'itens');

        // Organizar por categoria
        const personalTodos: TodoItem[] = [];
        const workoutTodos: TodoItem[] = [];
        const dietTodos: TodoItem[] = [];
        const customTodos: TodoItem[] = [];

        data?.forEach(todo => {
          const todoItem: TodoItem = {
            id: todo.id,
            text: todo.text,
            completed: todo.completed,
            createdAt: new Date(todo.created_at)
          };

          switch (todo.category) {
            case TodoCategory.Personal:
              personalTodos.push(todoItem);
              break;
            case TodoCategory.Workout:
              workoutTodos.push(todoItem);
              break;
            case TodoCategory.Diet:
              dietTodos.push(todoItem);
              break;
            case TodoCategory.Custom:
              customTodos.push(todoItem);
              break;
          }
        });

        setTodos({
          [TodoCategory.Personal]: personalTodos,
          [TodoCategory.Workout]: workoutTodos,
          [TodoCategory.Diet]: dietTodos,
          [TodoCategory.Custom]: customTodos
        });

      } catch (error) {
        console.error('Erro ao carregar tarefas:', error);
        const errorMsg = `Erro ao carregar tarefas: ${error instanceof Error ? error.message : 'Erro desconhecido'}`;
        setConnectionError(errorMsg);
        toast.error(errorMsg);
        setupMockTodos();
      } finally {
        setIsLoading(false);
      }
    };

    loadTodos();
  }, [user]);

  // Configurar dados de exemplo
  const setupMockTodos = () => {
    setTodos({
      [TodoCategory.Personal]: [
        {
          id: "1",
          text: "Comprar novos tênis para treino",
          completed: false,
          createdAt: new Date()
        },
        {
          id: "2",
          text: "Agendar consulta com nutricionista",
          completed: false,
          createdAt: new Date(Date.now() - 86400000) // ontem
        }
      ],
      [TodoCategory.Workout]: [
        {
          id: "3",
          text: "Completar treino A esta semana",
          completed: false,
          createdAt: new Date()
        },
        {
          id: "4",
          text: "Aumentar carga no agachamento",
          completed: false,
          createdAt: new Date(Date.now() - 172800000) // 2 dias atrás
        }
      ],
      [TodoCategory.Diet]: [
        {
          id: "5",
          text: "Preparar marmitas para a semana",
          completed: false,
          createdAt: new Date()
        },
        {
          id: "6",
          text: "Reduzir consumo de açúcar",
          completed: false,
          createdAt: new Date(Date.now() - 259200000) // 3 dias atrás
        }
      ],
      [TodoCategory.Custom]: []
    });
  };

  // Adicionar nova tarefa
  const addTodo = async () => {
    if (!newTodoText.trim() || !user) return;
    
    // Gerar um UUID para a nova tarefa
    const todoId = uuidv4();
    
    const newTodo: TodoItem = {
      id: todoId, // Usar o UUID gerado em vez de um id local
      text: newTodoText.trim(),
      completed: false,
      createdAt: new Date()
    };
    
    try {
      // Verificar se usuário está autenticado e tem ID válido
      if (!user?.id) {
        throw new Error('Usuário não autenticado ou ID inválido');
      }

      console.log('Tentando adicionar tarefa com os dados:', {
        id: todoId, // Incluir o ID explicitamente
        user_id: user.id,
        text: newTodoText.trim(),
        category: selectedCategory,
        completed: false
      });
      
      // Tentar inserir na tabela com ID explícito
      const { data, error } = await supabase
        .from('treino_4aivzd_todos')
        .insert({
          id: todoId, // Fornecer o ID explicitamente
          user_id: user.id,
          text: newTodoText.trim(),
          category: selectedCategory,
          completed: false
        })
        .select();
        
      // Se houver erro, registrá-lo detalhadamente
      if (error) {
        console.error('Erro detalhado do Supabase:', formatSupabaseError(error));
        throw new Error(`Erro do Supabase: ${error.message}`);
      }
      
      // Se não houver erro, usar o ID retornado
      if (data && data.length > 0) {
        newTodo.id = data[0].id;
        console.log('Tarefa adicionada com sucesso:', data[0]);
      }
      
      // Atualizar estado local
      setTodos(prev => ({
        ...prev,
        [selectedCategory]: [newTodo, ...prev[selectedCategory]]
      }));
      
      setNewTodoText("");
      toast.success("Tarefa adicionada");
    } catch (error) {
      console.error('Erro ao adicionar tarefa:', error);
      toast.error(`Erro ao adicionar tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
      
      // Adicionar localmente mesmo em caso de erro
      setTodos(prev => ({
        ...prev,
        [selectedCategory]: [newTodo, ...prev[selectedCategory]]
      }));
      setNewTodoText("");
    }
  };

  // Marcar tarefa como concluída
  const completeTodo = async (id: string, category: TodoCategory) => {
    try {
      // Ignorar tarefas locais (sem persistência)
      if (!id.startsWith('local-')) {
        console.log('Atualizando tarefa para completa:', id);
        
        // Tentar atualizar com tratamento de erro aprimorado
        const { error } = await supabase
          .from('treino_4aivzd_todos')
          .update({ 
            completed: true 
          })
          .eq('id', id);
        
        if (error) {
          console.error('Erro detalhado ao completar tarefa:', formatSupabaseError(error));
          throw new Error(`Erro ao atualizar: ${error.message}`);
        }
      }
      
      // Atualizar estado local
      setTodos(prev => {
        const updatedTodos = [...prev[category]];
        const todoIndex = updatedTodos.findIndex(todo => todo.id === id);
        
        if (todoIndex !== -1) {
          updatedTodos[todoIndex] = { ...updatedTodos[todoIndex], completed: true };
        }
        
        return {
          ...prev,
          [category]: updatedTodos
        };
      });
      
      toast.success("Tarefa concluída!");
    } catch (error) {
      console.error('Erro ao completar tarefa:', error);
      toast.error(`Erro ao completar tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Remover tarefa
  const removeTodo = async (id: string, category: TodoCategory) => {
    try {
      // Ignorar tarefas locais (sem persistência)
      if (!id.startsWith('local-')) {
        console.log('Removendo tarefa:', id);
        
        // Tentar remover com tratamento de erro aprimorado
        const { error } = await supabase
          .from('treino_4aivzd_todos')
          .delete()
          .eq('id', id);
        
        if (error) {
          console.error('Erro detalhado ao remover tarefa:', formatSupabaseError(error));
          throw new Error(`Erro ao remover: ${error.message}`);
        }
      }
      
      // Atualizar estado local
      setTodos(prev => {
        const updatedTodos = prev[category].filter(todo => todo.id !== id);
        
        return {
          ...prev,
          [category]: updatedTodos
        };
      });
      
      toast.success("Tarefa removida!");
    } catch (error) {
      console.error('Erro ao remover tarefa:', error);
      toast.error(`Erro ao remover tarefa: ${error instanceof Error ? error.message : 'Erro desconhecido'}`);
    }
  };

  // Renderização de categoria com suas tarefas
  const renderCategoryTodos = (category: TodoCategory) => {
    const categoryTodos = todos[category];
    const title = category === TodoCategory.Personal 
      ? "Pessoais" 
      : category === TodoCategory.Workout 
        ? "Treinos" 
        : category === TodoCategory.Diet 
          ? "Alimentação" 
          : "Personalizado";
    
    return (
      <TabsContent value={category}>
        <Card>
          <CardHeader>
            <CardTitle>{title}</CardTitle>
            <CardDescription>
              Gerencie suas tarefas de {title.toLowerCase()}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex mb-4">
              <Input
                placeholder={`Adicionar nova tarefa de ${title.toLowerCase()}`}
                value={newTodoText}
                onChange={(e) => setNewTodoText(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addTodo()}
                className="mr-2"
              />
              <Button onClick={addTodo} disabled={!newTodoText.trim()}>
                <PlusCircle className="mr-1 h-4 w-4" />
                Adicionar
              </Button>
            </div>
            
            {categoryTodos.length === 0 ? (
              <div className="text-center py-4 text-muted-foreground">
                <p>Você não tem tarefas nesta categoria</p>
              </div>
            ) : (
              <div className="space-y-2">
                {categoryTodos.map(todo => (
                  <div 
                    key={todo.id} 
                    className={`flex items-center justify-between p-3 border rounded-md ${
                      todo.completed ? 'bg-muted/50' : ''
                    }`}
                  >
                    <div className="flex items-center">
                      <Checkbox 
                        id={`todo-${todo.id}`}
                        checked={todo.completed}
                        onCheckedChange={() => completeTodo(todo.id, category)}
                        disabled={todo.completed}
                      />
                      <label 
                        htmlFor={`todo-${todo.id}`} 
                        className={`ml-2 ${todo.completed ? 'line-through text-muted-foreground' : ''}`}
                      >
                        {todo.text}
                      </label>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      onClick={() => removeTodo(todo.id, category)}
                      className="h-8 w-8 p-0"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </TabsContent>
    );
  };

  return (
    <PageLayout>
      <div className="container mx-auto py-6">
        <h1 className="text-3xl font-bold mb-6">Minhas Tarefas</h1>
        
        {connectionError && (
          <div className="mb-6">
            <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-2">
              <div className="flex">
                <AlertTriangle className="h-5 w-5 text-yellow-500 mr-2" />
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Problema de conexão detectado</h3>
                  <p className="text-sm text-yellow-700 mt-1">{connectionError}</p>
                </div>
              </div>
            </div>
            <Button 
              variant="outline" 
              className="text-sm" 
              onClick={() => setShowDiagnostic(!showDiagnostic)}
            >
              {showDiagnostic ? "Ocultar diagnóstico" : "Mostrar diagnóstico"}
            </Button>
            
            {showDiagnostic && (
              <div className="mt-4">
                <SupabaseDiagnostic />
              </div>
            )}
          </div>
        )}
        
        {isLoading ? (
          <div className="flex items-center justify-center h-40">
            <p>Carregando...</p>
          </div>
        ) : (
          <Tabs 
            defaultValue={TodoCategory.Personal} 
            onValueChange={(value) => setSelectedCategory(value as TodoCategory)}
            className="w-full"
          >
            <TabsList className="grid w-full grid-cols-4 mb-4">
              <TabsTrigger value={TodoCategory.Personal}>Pessoais</TabsTrigger>
              <TabsTrigger value={TodoCategory.Workout}>Treinos</TabsTrigger>
              <TabsTrigger value={TodoCategory.Diet}>Alimentação</TabsTrigger>
              <TabsTrigger value={TodoCategory.Custom}>Personalizado</TabsTrigger>
            </TabsList>
            
            {renderCategoryTodos(TodoCategory.Personal)}
            {renderCategoryTodos(TodoCategory.Workout)}
            {renderCategoryTodos(TodoCategory.Diet)}
            {renderCategoryTodos(TodoCategory.Custom)}
          </Tabs>
        )}
      </div>
    </PageLayout>
  );
};

export default TodoPage; 