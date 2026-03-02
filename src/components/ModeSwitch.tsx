"use client";

import React from 'react';
import { AppMode } from '@/app/lib/motion-duo-types';
import { cn } from '@/lib/utils';
import { Edit3, Activity, Settings, HelpCircle, Share2, PanelRightClose, PanelRightOpen, MessageSquareText, RotateCw, RefreshCw } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface ModeSwitchProps {
  mode: AppMode;
  setMode: (mode: AppMode) => void;
  isSidePanelOpen?: boolean;
  onToggleSidePanel?: () => void;
  isDescriptionBoxOpen?: boolean;
  onToggleDescriptionBox?: () => void;
  onRetry?: () => void;
  onReplay?: () => void;
}

export const ModeSwitch: React.FC<ModeSwitchProps> = ({
  mode,
  setMode,
  isSidePanelOpen,
  onToggleSidePanel,
  isDescriptionBoxOpen,
  onToggleDescriptionBox,
  onRetry,
  onReplay
}) => {
  return (
    <div className="h-14 bg-[#232326] border-b border-white/5 flex items-center justify-between px-4 md:px-6 shrink-0 z-50">
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 bg-primary rounded-md flex items-center justify-center">
            <div className="w-3 h-3 bg-white rounded-full" />
          </div>
          <span className="font-bold tracking-tight text-white hidden sm:inline-block text-sm">MOTION DUO</span>
        </div>
        <div className="h-4 w-px bg-white/10 hidden xl:block" />
        <p className="text-[10px] text-white/40 uppercase tracking-widest hidden xl:block">Pro Studio</p>

        {/* Desktop Description Toggle */}
        <button
          onClick={onToggleDescriptionBox}
          className={cn(
            "hidden md:flex items-center gap-2 px-3 py-1.5 rounded-md text-[10px] font-semibold transition-all duration-300 ml-2 border",
            isDescriptionBoxOpen
              ? "bg-[#232326] text-white border-white/10"
              : "border-transparent text-white/40 hover:text-white/60 hover:bg-white/5"
          )}
        >
          <MessageSquareText className="w-3.5 h-3.5" />
          DESCRIPTION
        </button>
      </div>

      <div className="flex bg-black/40 p-1 rounded-full border border-white/5">
        <button
          onClick={() => setMode('sketch')}
          className={cn(
            "flex items-center gap-2 px-4 md:px-6 py-1.5 rounded-full text-[10px] md:text-xs font-semibold transition-all duration-300",
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
            "flex items-center gap-2 px-4 md:px-6 py-1.5 rounded-full text-[10px] md:text-xs font-semibold transition-all duration-300",
            mode === 'motion'
              ? "bg-[#232326] text-white shadow-xl ring-1 ring-white/10"
              : "text-white/40 hover:text-white/60"
          )}
        >
          <Activity className="w-3.5 h-3.5" />
          MOTION
        </button>
      </div>

      <div className="flex items-center gap-1 md:gap-3">
        {mode === 'motion' ? (
          <>
            <button
              onClick={onReplay}
              className="p-2 flex items-center justify-center text-white/80 bg-white/10 rounded-full hover:bg-white/20 transition-colors"
              title="Replay Animation"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={onRetry}
              className="p-2 flex items-center justify-center text-primary bg-primary/10 rounded-full hover:bg-primary/20 transition-colors"
              title="Retry Generation"
            >
              <RotateCw className="w-4 h-4" />
            </button>
          </>
        ) : (
          <button className="hidden md:block p-2 text-white/40 hover:text-white transition-colors" title="Share Sketch">
            <Share2 className="w-4 h-4" />
          </button>
        )}
        <button className="p-2 text-white/40 hover:text-white transition-colors hidden sm:block">
          <Settings className="w-4 h-4" />
        </button>

        {/* Side Panel Toggle for Tablet/Desktop */}
        <div className="hidden md:block h-4 w-px bg-white/10 mx-1" />

        <Tooltip>
          <TooltipTrigger asChild>
            <button
              onClick={onToggleSidePanel}
              className="hidden md:flex p-2 text-white/40 hover:text-white transition-colors"
            >
              {isSidePanelOpen ? <PanelRightClose className="w-4 h-4" /> : <PanelRightOpen className="w-4 h-4" />}
            </button>
          </TooltipTrigger>
          <TooltipContent side="bottom">
            <p className="text-xs">{isSidePanelOpen ? 'Hide Side Panel' : 'Show Side Panel'}</p>
          </TooltipContent>
        </Tooltip>

        <button className="p-2 text-white/40 hover:text-white transition-colors hidden sm:block">
          <HelpCircle className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
