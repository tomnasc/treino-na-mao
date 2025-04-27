import React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "../ui/dialog";
import { Input } from "../ui/input";
import { Label } from "../ui/label";
import { Textarea } from "../ui/textarea";
import { Button } from "../ui/button";
import { Flag } from 'lucide-react';

interface CompletionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  sessionNotes: string;
  setSessionNotes: (notes: string) => void;
  perceivedEffort: number;
  setPerceivedEffort: (effort: number) => void;
  onFinish: () => Promise<void>;
}

export const CompletionDialog: React.FC<CompletionDialogProps> = ({
  open,
  onOpenChange,
  sessionNotes,
  setSessionNotes,
  perceivedEffort,
  setPerceivedEffort,
  onFinish
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Parabéns! Treino concluído!</DialogTitle>
          <DialogDescription>
            Você completou o treino. Adicione algumas observações antes de finalizar.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="perceived_effort">Nível de esforço percebido (1-10)</Label>
            <Input
              id="perceived_effort"
              type="number"
              min="1"
              max="10"
              value={perceivedEffort}
              onChange={(e) => setPerceivedEffort(parseInt(e.target.value))}
            />
            <p className="text-sm text-muted-foreground">1 = muito fácil, 10 = extremamente difícil</p>
          </div>
          
          <div className="space-y-2">
            <Label htmlFor="notes">Observações sobre o treino (opcional)</Label>
            <Textarea
              id="notes"
              placeholder="Como você se sentiu? O que poderia melhorar?"
              value={sessionNotes}
              onChange={(e) => setSessionNotes(e.target.value)}
              rows={4}
            />
          </div>
        </div>
        
        <DialogFooter>
          <Button onClick={onFinish}>
            <Flag className="mr-2 h-4 w-4" />
            Finalizar Treino
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}; 