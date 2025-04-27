import { useState, useEffect, useRef, useCallback } from 'react';

interface TimerState {
  isResting: boolean;
  timeRemaining: number;
  isPaused: boolean;
  startTime: number | null;
  endTime: number | null;
}

export interface UseExerciseTimerResult {
  isResting: boolean;
  timeRemaining: number;
  isPaused: boolean;
  startTimer: (duration: number) => void;
  pauseTimer: () => void;
  resumeTimer: () => void;
  skipTimer: () => void;
  formatTime: (seconds: number) => string;
}

export function useExerciseTimer(): UseExerciseTimerResult {
  // Estados para o timer
  const [isResting, setIsResting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState(0);
  const [isPaused, setIsPaused] = useState(false);
  const [timerStartTime, setTimerStartTime] = useState<number | null>(null);
  const [timerEndTime, setTimerEndTime] = useState<number | null>(null);

  // Refs para uso em callbacks e efeitos
  const timerRef = useRef<number | null>(null);
  const timerStateRef = useRef<TimerState>({
    isResting: false,
    timeRemaining: 0,
    isPaused: false,
    startTime: null,
    endTime: null
  });

  // Atualizar a ref do estado do timer
  useEffect(() => {
    timerStateRef.current = {
      isResting,
      timeRemaining,
      isPaused,
      startTime: timerStartTime,
      endTime: timerEndTime
    };
  }, [isResting, timeRemaining, isPaused, timerStartTime, timerEndTime]);

  // Timer function - usa tempo absoluto em vez de decrementos relativos
  useEffect(() => {
    // Limpar qualquer temporizador existente ao mudar estados
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    // Iniciar novo timer apenas se estiver em descanso e não pausado
    if (isResting && !isPaused && timeRemaining > 0) {
      // Simples, direto e eficaz
      timerRef.current = window.setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            // Quando o timer chegar a zero, limpar o intervalo e emitir o som
            clearInterval(timerRef.current!);
            timerRef.current = null;
            playTimerEndSound();
            setIsResting(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isResting, isPaused, timeRemaining]);

  // Melhorar o listener para o evento de visibilidade
  useEffect(() => {
    // Esta variável garante que não processaremos o evento de visibilidade várias vezes
    let isProcessingVisibilityEvent = false;
    
    const handleVisibilityChange = () => {
      // Evitar processamento duplicado
      if (isProcessingVisibilityEvent) return;
      
      // Marcar que estamos processando o evento
      isProcessingVisibilityEvent = true;
      
      try {
        if (document.visibilityState === 'hidden') {
          // Página foi ocultada
          if (isResting && timeRemaining > 0) {
            console.log('Salvando timer ao sair:', timeRemaining, 'segundos, pausado:', isPaused);
            
            // Salvar dados mais simples no localStorage
            const timerData = {
              timestamp: Date.now(),
              timeRemaining,
              isResting,
              isPaused
            };
            
            localStorage.setItem('workoutTimer', JSON.stringify(timerData));
          }
          
          // Parar o cronômetro enquanto a página estiver oculta
          if (timerRef.current) {
            clearInterval(timerRef.current);
            timerRef.current = null;
          }
          
        } else if (document.visibilityState === 'visible') {
          // Página voltou a ficar visível
          try {
            const savedTimerString = localStorage.getItem('workoutTimer');
            
            if (savedTimerString) {
              const savedTimer = JSON.parse(savedTimerString);
              console.log('Restaurando timer ao voltar:', savedTimer);
              
              // Calcular o tempo decorrido desde que a página ficou oculta
              const elapsed = Math.floor((Date.now() - savedTimer.timestamp) / 1000);
              console.log('Tempo decorrido:', elapsed, 'segundos');
              
              // Só subtrair o tempo decorrido se o timer não estava pausado
              const newTimeRemaining = savedTimer.isPaused 
                ? savedTimer.timeRemaining 
                : Math.max(0, savedTimer.timeRemaining - elapsed);
              
              console.log('Novo tempo restante:', newTimeRemaining);
              
              if (savedTimer.isResting && newTimeRemaining > 0) {
                // Atualizar os estados
                setIsResting(true);
                setTimeRemaining(newTimeRemaining);
                setIsPaused(savedTimer.isPaused);
                
                // Se não estiver pausado, o useEffect acima vai cuidar de reiniciar o timer
                // Não precisamos iniciar manualmente aqui
              } else if (savedTimer.isResting && newTimeRemaining <= 0) {
                // O timer terminou enquanto estávamos fora
                setIsResting(false);
                setTimeRemaining(0);
                playTimerEndSound();
              }
              
              // Limpar o timer salvo para evitar processamentos duplicados
              localStorage.removeItem('workoutTimer');
            }
          } catch (error) {
            console.error('Erro ao restaurar o timer:', error);
          }
        }
      } finally {
        // Garantir que a flag seja resetada mesmo em caso de erro
        setTimeout(() => {
          isProcessingVisibilityEvent = false;
        }, 100);
      }
    };

    // Adicionar e remover o event listener
    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [isResting, isPaused, timeRemaining]);

  // Play sound when timer ends
  const playTimerEndSound = () => {
    try {
      // Verificar se AudioContext é suportado pelo navegador
      if (window.AudioContext || (window as any).webkitAudioContext) {
        const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
        
        // Configurar oscilador para beep
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.type = 'sine';
        oscillator.frequency.value = 880; // A5 note - beep sound
        gainNode.gain.value = 0.5;
        
        // Iniciar e parar o beep após 300ms
        oscillator.start();
        setTimeout(() => {
          oscillator.stop();
          audioContext.close().catch(err => console.error('Error closing audio context:', err));
        }, 300);
      } else {
        // Fallback para navegadores sem suporte a AudioContext
        // Criar um elemento de áudio com um beep em base64
        const audioElement = new Audio("data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1OXQlkkLHHDH+OKhQgkUXrH0/8d2LA0tititnWRAEUqc3PbfoVgSM4bM7cqETRE2iMDo1Z1fHiJ/yueihE0ULXfR9dKOTxUnborD6caCQRMwdNL8vpBQGzOEtd+mfFAbPX263LCWXBgpb9L2yJFSFyVnx//Sjk8VLmG9/uGbWBIhWrj/3qRiFht7ve7SklMYKWvI/8aRRhExdsTofYpMGDZlwfPMlFUUJGjM9MeSThM2bLj0025BBzFxxvLFjEUPQoW+2J1QEkB0u+Kzg0UQPXmz3Kd+URc/hbezbkAONniw3rt+SxRRkLrU3EgFHFar6PF2KhAuWqzw+4IqDCdPq/N7RR4LLF2t8ul/PQgnVbDgvnwxBjFCr/qWTScSN0q4/rJmLBEwP6nxnFUjER04ren0nMRXGQAAIfkEBQQAAAAsYABgAGQA3QAAB/+AAIKDhIWGh4iJiouMjY6PkJGSk5SVlpeYmZqbnJ2en6ChoqOkpaanqKmqq6ytrq+wsbKztLW2t7i5uru8vb6/wMHCw8TFxsfIycrLzM3Oz9DR0tPU1dbX2Nna29zd3t/g4eLj5OXm5+jp6uvs7e7v8PHy8/T19vf4+fr7/P3+/wADChxIsKDBgwgTKlzIsKHDhxAjSpxIsaLFixgzatzIsaPHjyBDihxJsqTJkyhTqlzJsqXLlzBjypxJs6bNmzhz6tzJs6fPn0CDCh1KtKjRo0iTKl3KtKnTp1CjSp1KtarVq1izat3KtavXr2DDih1LtqzZs2jTql3Ltq3bt3D/48qdS7eu3bt48+rdy7ev37+AAwseTLiw4cOIEytezLix48eQI0ueTLmy5cuYM2vezLmz58+gQ4seTbq06dOoU6tezbq169ewY8ueTbu27du4c+vezbu379/AgwsfTry48ePIkytfzry58+fQo0ufTr269evYs2vfzr279+/gw4sfT768+fPo06tfz769+/fw48ufT7++/fv48+vfz7+///8ABijggAQWaOCBCCao4IIMNujggxBGKOGEFFZo4YUYZqjhhhx26OGHIIYo4ogklmjiiSimqOKKLLbo4oswxijjjDTWaOONOOao44489ujjj0AGKeSQRBZp5JFIJqnk/5JMNunkk1BGKeWUVFZp5ZVYZqnlllx26eWXYIYp5phklmnmmWimqeaabLbp5ptwxinnnHTWaeedeOap55589unnn4AGKuighBZq6KGIJqrooow26uijkEYq6aSUVmrppZhmqummnHbq6aeghirqqKSWauqpqKaq6qqsturqq7DGKuustNZq66245qrrrrz26uuvwAYr7LDEFmvsscgmq+yyzDbr7LPQRivttNRWa+212Gar7bbcduvtt+CGK+645JZr7rnopqvuuuy26+678MYr77z01mvvvfjmq+++/Pbr778AByzwwAQXbPDBCCes8MIMN+zwwxBHLPHEFFds8Y3FGGes8cYcd+zxxyCHLPLIJJds8skon6zyyiy37PLLMMcs88w012zzzTjnrPPOPPfs889ABy300EQXbfTRSCet9NJMN+3001BHLfXUVFdt9dVYZ6311lx37fXXYIct9thkl2322WinrfbabLft9ttwxy333HTXbffdeOet99589+3334AHLvjghBceXyAAOw==");
        audioElement.volume = 0.5;
        audioElement.play().catch(err => {
          console.log('Fallback audio playback error:', err);
        });
      }
    } catch (error) {
      console.error('Error playing sound:', error);
      
      // Caso falhe totalmente, tentar apenas console.log como último recurso
      // Isso é útil para debugging, mas também serve como indicação visual
      console.log('%c 🔔 TIMER FINISHED! 🔔', 'font-size: 20px; color: red; background-color: yellow;');
    }
  };

  // Format time for display
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }, []);

  // Timer control functions
  const startTimer = useCallback((duration: number) => {
    if (duration <= 0) return;
    
    setIsResting(true);
    setIsPaused(false);
    setTimeRemaining(duration);
    
    // Configurar tempos absolutos
    const now = Date.now();
    setTimerStartTime(now);
    setTimerEndTime(now + duration * 1000);
  }, []);

  const pauseTimer = useCallback(() => {
    setIsPaused(true);
    // Ao pausar, mantemos o timeRemaining atual mas limpamos os tempos absolutos
    setTimerStartTime(null);
    setTimerEndTime(null);
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const resumeTimer = useCallback(() => {
    // Não retomar se não estiver em descanso ou se o tempo restante for zero
    if (!isResting || timeRemaining <= 0) return;
    
    setIsPaused(false);
    // Ao retomar, configuramos novos tempos absolutos
    const now = Date.now();
    setTimerStartTime(now);
    setTimerEndTime(now + timeRemaining * 1000);
  }, [isResting, timeRemaining]);

  const skipTimer = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setIsResting(false);
    setTimeRemaining(0);
    setTimerStartTime(null);
    setTimerEndTime(null);
  }, []);

  return {
    isResting,
    timeRemaining,
    isPaused,
    startTimer,
    pauseTimer,
    resumeTimer,
    skipTimer,
    formatTime
  };
} 