"use client";

import React from 'react';
import { AppMode } from '@/app/lib/motion-duo-types';
import { Button } from '@/components/ui/button';
import { Undo, Redo, Play, Pause, SkipBack, SkipForward, Clock } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface BottomControlsProps {
  appMode: AppMode;
  onUndo: () => void;
  onRedo: () => void;
}

export const BottomControls: React.FC<BottomControlsProps> = ({
  appMode,
  onUndo,
  onRedo,
}) => {
  const [isPlaying, setIsPlaying] = React.useState(false);

  if (appMode === 'motion') {
    return null;
  }

  return (
    <div className="h-20 bg-[#232326] border-t border-white/5 flex items-center px-4 md:px-6 gap-4 md:gap-6 w-full shrink-0">
      <div className="flex gap-4 items-center w-full justify-center">
        <Button
          variant="outline"
          size="lg"
          onClick={onUndo}
          className="border-white/5 bg-black/20 hover:bg-white/5 text-white rounded-xl px-4 md:px-8 flex gap-2 h-12"
        >
          <Undo className="w-4 h-4" />
          <span className="hidden sm:inline">Undo</span>
        </Button>
        <Button
          variant="outline"
          size="lg"
          onClick={onRedo}
          className="border-white/5 bg-black/20 hover:bg-white/5 text-white rounded-xl px-4 md:px-8 flex gap-2 h-12"
        >
          <Redo className="w-4 h-4" />
          <span className="hidden sm:inline">Redo</span>
        </Button>
        <div className="absolute right-4 md:right-8 text-[9px] md:text-[10px] text-white/30 uppercase tracking-[0.2em] hidden sm:block">
          Sketch Mode
        </div>
      </div>
    </div>
  );
};