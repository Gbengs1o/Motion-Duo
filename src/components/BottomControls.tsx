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

  return (
    <div className="h-20 bg-[#232326] border-t border-white/5 flex items-center px-6 gap-6 w-full">
      {appMode === 'sketch' ? (
        <div className="flex gap-4 items-center w-full justify-center">
          <Button 
            variant="outline" 
            size="lg" 
            onClick={onUndo}
            className="border-white/5 bg-black/20 hover:bg-white/5 text-white rounded-xl px-8 flex gap-2"
          >
            <Undo className="w-4 h-4" />
            Undo
          </Button>
          <Button 
            variant="outline" 
            size="lg" 
            onClick={onRedo}
            className="border-white/5 bg-black/20 hover:bg-white/5 text-white rounded-xl px-8 flex gap-2"
          >
            <Redo className="w-4 h-4" />
            Redo
          </Button>
          <div className="absolute right-8 text-[10px] text-white/30 uppercase tracking-[0.2em]">
            Sketch Mode Active
          </div>
        </div>
      ) : (
        <div className="flex gap-6 items-center w-full">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-10 w-10 text-white/60 hover:text-white">
              <SkipBack className="w-4 h-4" />
            </Button>
            <Button 
              onClick={() => setIsPlaying(!isPlaying)}
              className="h-12 w-12 rounded-full bg-primary hover:bg-primary/90 text-white flex items-center justify-center shadow-lg shadow-primary/20"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-1" />}
            </Button>
            <Button variant="ghost" size="icon" className="h-10 w-10 text-white/60 hover:text-white">
              <SkipForward className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex-1 flex flex-col gap-1 px-4">
            <div className="flex justify-between items-center text-[10px] text-white/30 font-mono">
              <span>00:00:00</span>
              <span className="text-primary font-bold">SCRUBBER</span>
              <span>00:00:10</span>
            </div>
            <Slider defaultValue={[0]} max={100} step={1} className="w-full" />
          </div>

          <div className="flex items-center gap-3 bg-black/20 px-4 py-2 rounded-xl border border-white/5">
            <Clock className="w-4 h-4 text-primary" />
            <span className="text-xs font-mono text-white/80">24 FPS</span>
          </div>
        </div>
      )}
    </div>
  );
};