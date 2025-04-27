import React, { useState, useEffect } from "react";
import { useTraining } from "../contexts/TrainingContext";
import { WorkoutSession, ExerciseLog, SessionStatus } from "../types";
import { useLocation } from "react-router-dom";
import PageLayout from "../components/layout/PageLayout";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Button } from "../components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "../components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "../components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { Skeleton } from "../components/ui/skeleton";
import { Loader2, Calendar, Dumbbell, Clock, Heart } from "lucide-react";

const HistoryPage: React.FC = () => {
  const { getSessionHistory, getSessionDetails, isLoading } = useTraining();
  const [sessions, setSessions] = useState<WorkoutSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<WorkoutSession | null>(null);
  const [sessionLogs, setSessionLogs] = useState<ExerciseLog[] | null>(null);
  const [isLoadingDetails, setIsLoadingDetails] = useState(false);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const location = useLocation();
  
  useEffect(() => {
    loadSessionHistory();
  }, []);
  
  useEffect(() => {
    const checkForSelectedSession = async () => {
      const { state } = location;
      if (state && state.selectedSessionId && sessions.length > 0) {
        const sessionToShow = sessions.find(s => s.id === state.selectedSessionId);
        if (sessionToShow) {
          await handleViewDetails(sessionToShow);
        }
      }
    };

    checkForSelectedSession();
  }, [sessions, location.state]);
  
  const loadSessionHistory = async () => {
    const sessionData = await getSessionHistory();
    setSessions(sessionData);
  };
  
  const handleViewDetails = async (session: WorkoutSession) => {
    setSelectedSession(session);
    setShowDetailsDialog(true);
    setIsLoadingDetails(true);
    
    try {
      const { logs } = await getSessionDetails(session.id);
      setSessionLogs(logs);
    } catch (error) {
      console.error("Erro ao carregar detalhes da sessão:", error);
    } finally {
      setIsLoadingDetails(false);
    }
  };
  
  const formatDuration = (minutes?: number) => {
    if (!minutes) return "Não registrado";
    
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    
    if (hours > 0) {
      return `${hours}h ${mins}min`;
    }
    
    return `${mins}min`;
  };
  
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("pt-BR", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };
  
  const getStatusBadge = (status: SessionStatus) => {
    switch (status) {
      case SessionStatus.Completed:
        return <Badge className="bg-green-500">Concluído</Badge>;
      case SessionStatus.InProgress:
        return <Badge className="bg-blue-500">Em Progresso</Badge>;
      case SessionStatus.Abandoned:
        return <Badge className="bg-red-500">Abandonado</Badge>;
      case SessionStatus.Paused:
        return <Badge className="bg-yellow-500">Pausado</Badge>;
      default:
        return <Badge className="bg-gray-500">Desconhecido</Badge>;
    }
  };
  
  const filteredSessions = statusFilter === "all" 
    ? sessions 
    : sessions.filter(session => session.status === statusFilter);
  
  const getBasicStats = () => {
    const completedSessions = sessions.filter(s => s.status === SessionStatus.Completed);
    const totalSessions = completedSessions.length;
    
    if (totalSessions === 0) {
      return {
        totalTime: 0,
        avgTime: 0,
        totalWorkouts: 0,
        avgEffort: 0,
      };
    }
    
    const totalTime = completedSessions.reduce((sum, session) => sum + (session.duration_minutes || 0), 0);
    const avgTime = totalTime / totalSessions;
    
    const sessionsWithEffort = completedSessions.filter(s => s.perceived_effort !== undefined && s.perceived_effort !== null);
    const avgEffort = sessionsWithEffort.length > 0
      ? sessionsWithEffort.reduce((sum, session) => sum + (session.perceived_effort || 0), 0) / sessionsWithEffort.length
      : 0;
    
    // Contar treinos únicos
    const uniqueWorkouts = new Set(completedSessions.map(s => s.workout_id)).size;
    
    return {
      totalTime,
      avgTime,
      totalWorkouts: uniqueWorkouts,
      avgEffort,
    };
  };
  
  const stats = getBasicStats();
  
  return (
    <PageLayout>
      <main className="container mx-auto py-6 px-4 md:px-6">
        <h1 className="text-3xl font-bold mb-6">Histórico de Treinos</h1>
        
        <Tabs defaultValue="history" className="mb-8">
          <TabsList className="mb-4">
            <TabsTrigger value="history">Histórico</TabsTrigger>
            <TabsTrigger value="stats">Estatísticas</TabsTrigger>
          </TabsList>
          
          <TabsContent value="stats">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Total de Treinos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Dumbbell className="w-5 h-5 mr-2 text-primary" />
                    <span className="text-2xl font-bold">{sessions.length}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Treinos Concluídos
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Calendar className="w-5 h-5 mr-2 text-primary" />
                    <span className="text-2xl font-bold">
                      {sessions.filter(s => s.status === SessionStatus.Completed).length}
                    </span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Tempo Total
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Clock className="w-5 h-5 mr-2 text-primary" />
                    <span className="text-2xl font-bold">{formatDuration(stats.totalTime)}</span>
                  </div>
                </CardContent>
              </Card>
              
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    Esforço Médio
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center">
                    <Heart className="w-5 h-5 mr-2 text-primary" />
                    <span className="text-2xl font-bold">
                      {stats.avgEffort > 0 ? stats.avgEffort.toFixed(1) : "N/A"}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
          
          <TabsContent value="history">
            <div className="flex justify-between items-center mb-4">
              <div className="flex items-center space-x-2">
                <span className="text-sm font-medium">Filtrar por status:</span>
                <Select
                  value={statusFilter}
                  onValueChange={setStatusFilter}
                >
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Selecione um status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value={SessionStatus.Completed}>Concluídos</SelectItem>
                    <SelectItem value={SessionStatus.InProgress}>Em Progresso</SelectItem>
                    <SelectItem value={SessionStatus.Abandoned}>Abandonados</SelectItem>
                    <SelectItem value={SessionStatus.Paused}>Pausados</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <Button 
                variant="outline" 
                onClick={loadSessionHistory}
                disabled={isLoading}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Atualizando...
                  </>
                ) : (
                  "Atualizar"
                )}
              </Button>
            </div>
            
            {isLoading ? (
              <div className="space-y-4">
                {[1, 2, 3].map((i) => (
                  <Card key={i}>
                    <CardHeader>
                      <Skeleton className="h-5 w-1/3" />
                      <Skeleton className="h-4 w-1/4" />
                    </CardHeader>
                    <CardContent>
                      <Skeleton className="h-4 w-full" />
                      <Skeleton className="h-4 w-2/3 mt-2" />
                    </CardContent>
                    <CardFooter>
                      <Skeleton className="h-10 w-24" />
                    </CardFooter>
                  </Card>
                ))}
              </div>
            ) : filteredSessions.length === 0 ? (
              <div className="text-center py-10">
                <p className="text-muted-foreground">Nenhum treino encontrado</p>
              </div>
            ) : (
              <div className="space-y-4">
                {filteredSessions.map((session) => (
                  <Card key={session.id}>
                    <CardHeader>
                      <div className="flex justify-between items-start">
                        <CardTitle>{session.workout?.title || "Treino sem título"}</CardTitle>
                        {getStatusBadge(session.status)}
                      </div>
                      <CardDescription>
                        Iniciado em: {formatDate(session.started_at)}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {session.status === SessionStatus.Completed && (
                        <div className="grid grid-cols-2 gap-2 text-sm">
                          <div>
                            <span className="font-medium">Duração:</span> {formatDuration(session.duration_minutes)}
                          </div>
                          {session.perceived_effort !== undefined && session.perceived_effort !== null && (
                            <div>
                              <span className="font-medium">Esforço percebido:</span> {session.perceived_effort}/10
                            </div>
                          )}
                          {session.mood_rating !== undefined && session.mood_rating !== null && (
                            <div>
                              <span className="font-medium">Humor:</span> {session.mood_rating}/5
                            </div>
                          )}
                        </div>
                      )}
                      {session.notes && (
                        <div className="mt-2">
                          <span className="font-medium">Notas:</span> {session.notes}
                        </div>
                      )}
                    </CardContent>
                    <CardFooter>
                      <Button 
                        variant="outline" 
                        onClick={() => handleViewDetails(session)}
                      >
                        Ver Detalhes
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
        
        {/* Dialog de detalhes da sessão */}
        <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
          <DialogContent className="max-w-3xl">
            <DialogHeader>
              <DialogTitle>
                Detalhes do Treino: {selectedSession?.workout?.title || "Treino sem título"}
              </DialogTitle>
              <DialogDescription>
                {selectedSession && (
                  <>
                    Realizado em {formatDate(selectedSession.started_at)}
                    {selectedSession.status === SessionStatus.Completed && selectedSession.completed_at && (
                      <> • Finalizado em {formatDate(selectedSession.completed_at)}</>
                    )}
                  </>
                )}
              </DialogDescription>
            </DialogHeader>
            
            {isLoadingDetails ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : sessionLogs && sessionLogs.length > 0 ? (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Exercício</TableHead>
                      <TableHead className="text-center">Série</TableHead>
                      <TableHead className="text-center">Repetições</TableHead>
                      <TableHead className="text-center">Peso (kg)</TableHead>
                      <TableHead className="text-center">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionLogs.map((log) => (
                      <TableRow key={log.id}>
                        <TableCell className="font-medium">{log.exercise?.name || "Exercício desconhecido"}</TableCell>
                        <TableCell className="text-center">{log.set_number}</TableCell>
                        <TableCell className="text-center">{log.reps_completed ?? "-"}</TableCell>
                        <TableCell className="text-center">{log.weight_kg ?? "-"}</TableCell>
                        <TableCell className="text-center">
                          {log.was_skipped ? (
                            <Badge variant="outline" className="text-red-500 border-red-500">Pulado</Badge>
                          ) : (
                            <Badge variant="outline" className="text-green-500 border-green-500">Concluído</Badge>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-muted-foreground">Nenhum registro de exercício encontrado para esta sessão.</p>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </PageLayout>
  );
};

export default HistoryPage; 