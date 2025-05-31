
import React, { useRef } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Play, X, CheckCircle } from 'lucide-react';
import { motion } from 'framer-motion';

interface AgentIntroVideoModalProps {
  isOpen: boolean;
  onVideoComplete: () => void;
  onSkip: () => void;
  isUpdating: boolean;
}

export function AgentIntroVideoModal({
  isOpen,
  onVideoComplete,
  onSkip,
  isUpdating
}: AgentIntroVideoModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  const handleVideoEnd = () => {
    onVideoComplete();
  };

  const handlePlayVideo = () => {
    if (videoRef.current) {
      videoRef.current.play();
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={() => {}}>
      <DialogContent className="max-w-4xl w-full max-h-[90vh] p-0 overflow-hidden">
        <div className="relative">
          <div className="absolute top-4 right-4 z-10">
            <Button
              variant="ghost"
              size="sm"
              onClick={onSkip}
              disabled={isUpdating}
              className="bg-white/10 hover:bg-white/20 text-white backdrop-blur-sm"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
          
          <div className="bg-gradient-to-br from-crunch-yellow to-crunch-yellow/80 p-6 text-crunch-black">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <DialogHeader className="text-center space-y-4">
                <div className="mx-auto w-16 h-16 bg-crunch-black/10 rounded-full flex items-center justify-center">
                  <Play className="h-8 w-8 text-crunch-black" />
                </div>
                <DialogTitle className="text-2xl font-bold">
                  Welcome to Crunch Carbon!
                </DialogTitle>
                <DialogDescription className="text-crunch-black/80 text-lg">
                  Watch this quick introduction to get started with creating carbon credit proposals.
                </DialogDescription>
              </DialogHeader>
            </motion.div>
          </div>

          <div className="p-6 space-y-6">
            <div className="relative bg-black rounded-lg overflow-hidden">
              <video
                ref={videoRef}
                className="w-full h-auto max-h-[60vh] object-contain"
                controls
                onEnded={handleVideoEnd}
                poster="/placeholder.svg"
              >
                <source src="/lovable-uploads/Intro-vid-480.mov" type="video/mp4" />
                <source src="/lovable-uploads/Intro-vid-480.mov" type="video/quicktime" />
                Your browser does not support the video tag.
              </video>
            </div>

            <div className="flex items-center justify-between gap-4">
              <Button
                variant="outline"
                onClick={onSkip}
                disabled={isUpdating}
                className="flex-1"
              >
                Skip Introduction
              </Button>
              
              <Button
                onClick={handlePlayVideo}
                className="flex-1 bg-crunch-yellow hover:bg-crunch-yellow/90 text-crunch-black"
              >
                <Play className="h-4 w-4 mr-2" />
                Play Video
              </Button>
              
              <Button
                onClick={onVideoComplete}
                disabled={isUpdating}
                className="flex-1 bg-green-600 hover:bg-green-700 text-white"
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                {isUpdating ? 'Saving...' : 'I\'ve Watched It'}
              </Button>
            </div>

            <div className="text-center text-sm text-muted-foreground">
              <p>This introduction will only be shown once. You can always access help resources later.</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
