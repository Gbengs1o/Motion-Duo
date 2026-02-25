"use client";

import React from 'react';
import { AppMode } from '@/app/lib/motion-duo-types';
import { cn } from '@/lib/utils';
import { Edit3, Activity, Settings, HelpCircle, Share2 } from 'lucide-react';

interface ModeSwitchProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
}

export const ModeSwitch: React.FC<ModeSwitchProps> = ({ mode, setMode }) => {
  return (
    <div className="h-14 bg-[#232326] border-b border-white/5 flex items-center justify-between px-6 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full" />
          </div>
          <span className="font-bold tracking-tight text-white hidden sm:inline-block">MOTION DUO</span>
        </div>
        <div className="h-4 w-px bg-white/10 hidden sm:block" />
        <p className="text-[10px] text-white/40 uppercase tracking-widest hidden sm:block">Pro Studio</p>
      </div>

      <div className="flex bg-black/40 p-1 rounded-full border border-white/5">
        <button
          onClick={() => setMode('sketch')}
          className={cn(
            "flex items-center gap-2 px-6 py-1.5 rounded-full text-xs font-semibold transition-all duration-300",
            mode === 'sketch' 
              ? "bg-[#232326] text-white shadow-xl ring-1 ring-white/10" 
              : "text-white/40 hover:text-white/60"
          )}
        >
          <Edit3 className="w-3.5 h-3.5" />
          SKETCH
        </button>
        <button
          onClick={() => setMode('motion')}
          className={cn(
            "flex items-center gap-2 px-6 py-1.5 rounded-full text-xs font-semibold transition-all duration-300",
            mode === 'motion' 
              ? "bg-[#232326] text-white shadow-xl ring-1 ring-white/10" 
              : "text-white/40 hover:text-white/60"
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          MOTION
        </button>
      </div>

      <div className="flex items-center gap-3">
        <button className="p-2 text-white/40 hover:text-white transition-colors">
          <Share2 className="w-4 h-4" />
        </button>
        <button className="p-2 text-white/40 hover:text-white transition-colors">
          <Settings className="w-4 h-4" />
        </button>
        <button className="p-2 text-white/40 hover:text-white transition-colors">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};