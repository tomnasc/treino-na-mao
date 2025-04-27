import React from 'react';
import { Button } from '../ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Clock, Pause, Play, SkipForward } from 'lucide-react';
import { UseExerciseTimerResult } from '../../hooks/useExerciseTimer';

interface RestTimerProps {
  timer: UseExerciseTimerResult;
}

export const RestTimer: React.FC<RestTimerProps> = ({ timer }) => {
  const { isResting, timeRemaining, isPaused, formatTime, pauseTimer, resumeTimer, skipTimer } = timer;

  if (!isResting) {
    return null;
  }

  return (
    <Card className="mb-6 border-primary">
      <CardHeader className="pb-2">
        <CardTitle className="flex items-center text-primary">
          <Clock className="mr-2 h-5 w-5" />
          Tempo de Descanso
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col items-center">
          <div className="text-4xl font-bold mb-4">{formatTime(timeRemaining)}</div>
          <div className="flex gap-2">
            {isPaused ? (
              <Button onClick={resumeTimer}>
                <Play className="mr-2 h-4 w-4" />
                Continuar
              </Button>
            ) : (
              <Button onClick={pauseTimer}>
                <Pause className="mr-2 h-4 w-4" />
                Pausar
              </Button>
            )}
            <Button variant="secondary" onClick={skipTimer}>
              <SkipForward className="mr-2 h-4 w-4" />
              Pular
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}; 