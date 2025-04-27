import React from 'react';
import ReactPlayer from 'react-player/youtube';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogClose
} from '../ui/dialog';
import { Button } from '../ui/button';
import { X } from 'lucide-react';

interface VideoModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  videoId: string;
  title?: string;
}

export const VideoModal: React.FC<VideoModalProps> = ({
  open,
  onOpenChange,
  videoId,
  title = 'Vídeo do Exercício'
}) => {
  const youtubeUrl = `https://www.youtube.com/watch?v=${videoId}?origin=${encodeURIComponent(window.location.origin)}`;
  
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-xl md:max-w-2xl p-0">
        <DialogHeader className="p-4">
          <div className="flex justify-between items-center">
            <DialogTitle>{title}</DialogTitle>
            <DialogClose asChild>
              <Button variant="ghost" size="icon">
                <X className="h-4 w-4" />
              </Button>
            </DialogClose>
          </div>
        </DialogHeader>
        <div className="aspect-video w-full">
          <ReactPlayer
            url={youtubeUrl}
            width="100%"
            height="100%"
            controls
            playing={open}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}; 