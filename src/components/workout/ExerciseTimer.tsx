import React, { useState, useEffect, useRef } from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Clock, Pause, Play, SkipForward, Repeat } from 'lucide-react';
import { Progress } from '../ui/progress';

interface ExerciseTimerProps {
  duration: number; // duração do exercício em segundos
  onComplete: () => void;
}

export const ExerciseTimer: React.FC<ExerciseTimerProps> = ({ duration, onComplete }) => {
  const [timeElapsed, setTimeElapsed] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);
  const timerRef = useRef<number | null>(null);
  const completedRef = useRef(false);

  // Formatar o tempo (MM:SS)
  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Chamada do callback de conclusão usando useEffect
  useEffect(() => {
    if (isCompleted && !completedRef.current) {
      completedRef.current = true;
      onComplete();
    }
  }, [isCompleted, onComplete]);

  // Iniciar o timer
  const startTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    timerRef.current = window.setInterval(() => {
      setTimeElapsed(prev => {
        if (prev >= duration) {
          clearInterval(timerRef.current!);
          setIsCompleted(true);
          return duration;
        }
        return prev + 1;
      });
    }, 1000);
  };

  // Pausar o timer
  const pauseTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    setIsPaused(true);
  };

  // Retomar o timer
  const resumeTimer = () => {
    setIsPaused(false);
    startTimer();
  };

  // Reiniciar o timer
  const resetTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    completedRef.current = false;
    setTimeElapsed(0);
    setIsPaused(false);
    setIsCompleted(false);
    startTimer();
  };

  // Pular o timer
  const skipTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    setTimeElapsed(duration);
    setIsCompleted(true);
  };

  // Iniciar o timer quando o componente montar
  useEffect(() => {
    startTimer();

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, []);

  // Calcular a porcentagem de progresso
  const progressPercentage = Math.min(Math.floor((timeElapsed / duration) * 100), 100);

  return (
    <Card className="mb-6 border-primary-foreground">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-primary">
          <Clock className="mr-2 h-5 w-5" />
          Tempo do Exercício
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="text-4xl font-bold mb-2">
            {formatTime(timeElapsed)} / {formatTime(duration)}
          </div>
          <Progress value={progressPercentage} className="w-full h-2 mb-4" />
          <div className="flex gap-2">
            {isPaused ? (
              <Button onClick={resumeTimer} disabled={isCompleted}>
                <Play className="mr-2 h-4 w-4" />
                Continuar
              </Button>
            ) : (
              <Button onClick={pauseTimer} disabled={isCompleted}>
                <Pause className="mr-2 h-4 w-4" />
                Pausar
              </Button>
            )}
            <Button onClick={resetTimer} variant="outline" disabled={isCompleted}>
              <Repeat className="mr-2 h-4 w-4" />
              Reiniciar
            </Button>
            {!isCompleted && (
              <Button variant="secondary" onClick={skipTimer}>
                <SkipForward className="mr-2 h-4 w-4" />
                Completar
              </Button>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 