
"use client";

import React from 'react';
import {
  Pencil, Eraser, Type, Palette, MousePointer2, Shapes, PaintBucket, Spline,
  Square, Circle, Triangle, Hexagon, Scissors, Trash2, Star, Gem, ArrowRight
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { ScrollArea } from '@/components/ui/scroll-area';

const tools = [
  { id: 'select', icon: MousePointer2, label: 'Transform Tool' },
  { id: 'pen', icon: Pencil, label: 'Pen Tool' },
  { id: 'vector', icon: Spline, label: 'Edit Points' },
  { id: 'eraser', icon: Eraser, label: 'Eraser Tool' },
  { id: 'shape', icon: Shapes, label: 'Shape Tool' },
  { id: 'fill', icon: PaintBucket, label: 'Fill Tool' },
  { id: 'text', icon: Type, label: 'Text Tool' },
];

const shapeOptions = [
  { id: 'rect', icon: Square, label: 'Rectangle' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'triangle', icon: Triangle, label: 'Triangle' },
  { id: 'polygon', icon: Hexagon, label: 'Polygon' },
  { id: 'star', icon: Star, label: 'Star' },
  { id: 'diamond', icon: Gem, label: 'Diamond' },
  { id: 'arrow', icon: ArrowRight, label: 'Arrow' },
];

const eraserModes = [
  { id: 'object' as const, icon: Trash2, label: 'Object Erase', desc: 'Delete entire element on contact' },
  { id: 'precise' as const, icon: Scissors, label: 'Precise Erase', desc: 'Cut through vector paths' },
];

const colors = [
  '#806CE0', '#3B82F6', '#10B981', '#F59E0B', '#EF4444',
  '#EC4899', '#FFFFFF', '#121214', '#232326'
];

interface ToolboxProps {
  className?: string;
  activeTool: string;
  setActiveTool: (tool: string) => void;
  activeShape: string;
  setActiveShape: (shape: string) => void;
  eraserMode: 'object' | 'precise';
  setEraserMode: (mode: 'object' | 'precise') => void;
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  canvasColor: string;
  setCanvasColor: (color: string) => void;
}

export const Toolbox: React.FC<ToolboxProps> = ({
  className, activeTool, setActiveTool, activeShape, setActiveShape,
  eraserMode, setEraserMode, primaryColor, setPrimaryColor, canvasColor, setCanvasColor,
}) => {

  const renderToolButton = (tool: typeof tools[0]) => {
    const isActive = activeTool === tool.id;
    const buttonClass = cn(
      "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 relative",
      isActive ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" : "text-white/40 hover:text-white hover:bg-white/5"
    );

    // Shape tool with popover
    if (tool.id === 'shape') {
      return (
        <Popover key={tool.id}>
          <Tooltip>
            <PopoverTrigger asChild>
              <TooltipTrigger asChild>
                <button className={buttonClass}>
                  <tool.icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
            </PopoverTrigger>
            <TooltipContent side="right"><p className="text-xs">{tool.label}</p></TooltipContent>
          </Tooltip>
          <PopoverContent side="right" className="w-40 bg-[#232326] border-white/10 p-2 ml-2">
            <div className="grid grid-cols-2 gap-2">
              {shapeOptions.map(shape => (
                <button key={shape.id}
                  onClick={() => { setActiveTool('shape'); setActiveShape(shape.id); }}
                  className={cn(
                    "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                    activeShape === shape.id && activeTool === 'shape' ? "bg-primary/20 text-primary" : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <shape.icon className="w-5 h-5" />
                  <span className="text-[10px] uppercase font-bold">{shape.id}</span>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    // Eraser tool with mode popover
    if (tool.id === 'eraser') {
      return (
        <Popover key={tool.id}>
          <Tooltip>
            <PopoverTrigger asChild>
              <TooltipTrigger asChild>
                <button className={buttonClass} onClick={() => setActiveTool('eraser')}>
                  <tool.icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
            </PopoverTrigger>
            <TooltipContent side="right"><p className="text-xs">{tool.label}</p></TooltipContent>
          </Tooltip>
          <PopoverContent side="right" className="w-52 bg-[#232326] border-white/10 p-2 ml-2">
            <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest mb-2 px-1">Eraser Mode</p>
            <div className="flex flex-col gap-1">
              {eraserModes.map(mode => (
                <button key={mode.id}
                  onClick={() => { setActiveTool('eraser'); setEraserMode(mode.id); }}
                  className={cn(
                    "flex items-center gap-3 p-2.5 rounded-lg transition-colors text-left",
                    eraserMode === mode.id && activeTool === 'eraser' ? "bg-primary/20 text-primary" : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <mode.icon className="w-4 h-4 shrink-0" />
                  <div>
                    <div className="text-xs font-semibold">{mode.label}</div>
                    <div className="text-[10px] opacity-60">{mode.desc}</div>
                  </div>
                </button>
              ))}
            </div>
          </PopoverContent>
        </Popover>
      );
    }

    // Default tool button
    return (
      <Tooltip key={tool.id}>
        <TooltipTrigger asChild>
          <button onClick={() => setActiveTool(tool.id)} className={buttonClass}>
            <tool.icon className="w-5 h-5" />
          </button>
        </TooltipTrigger>
        <TooltipContent side="right"><p className="text-xs">{tool.label}</p></TooltipContent>
      </Tooltip>
    );
  };

  return (
    <div className={cn("w-16 h-full bg-[#232326] border-r border-white/5 flex flex-col shrink-0 overflow-hidden", className)}>
      <ScrollArea className="flex-1 w-full">
        <div className="flex flex-col items-center py-6 gap-4">
          <div className="flex flex-col gap-2">
            {tools.map(renderToolButton)}
          </div>

          <div className="flex flex-col items-center gap-4 mt-4 pb-6">
            {/* Primary Color Picker */}
            <Tooltip>
              <Popover>
                <PopoverTrigger asChild>
                  <TooltipTrigger asChild>
                    <button className="w-8 h-8 rounded-full border-2 border-white/20 shadow-inner transition-transform hover:scale-110" style={{ backgroundColor: primaryColor }} />
                  </TooltipTrigger>
                </PopoverTrigger>
                <PopoverContent side="right" className="w-48 bg-[#232326] border-white/10 ml-2">
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Shape Color</p>
                    <div className="grid grid-cols-4 gap-2">
                      {colors.map(color => (
                        <button key={color} onClick={() => setPrimaryColor(color)} className="w-8 h-8 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <input 
                        type="color" 
                        value={primaryColor} 
                        onChange={(e) => setPrimaryColor(e.target.value)}
                        className="w-8 h-8 p-0 border-0 rounded overflow-hidden cursor-pointer bg-transparent"
                      />
                      <span className="text-xs text-white/60">Custom Color</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <TooltipContent side="right">Element Color</TooltipContent>
            </Tooltip>

            {/* Canvas Color Picker */}
            <Tooltip>
              <Popover>
                <PopoverTrigger asChild>
                  <TooltipTrigger asChild>
                    <button className="w-8 h-8 rounded-full border-2 border-white/20 shadow-inner transition-transform hover:scale-110 relative overflow-hidden" style={{ backgroundColor: canvasColor }}>
                      <div className="absolute inset-0 bg-white/5 flex items-center justify-center">
                        <div className="w-2 h-2 border border-white/20" />
                      </div>
                    </button>
                  </TooltipTrigger>
                </PopoverTrigger>
                <PopoverContent side="right" className="w-48 bg-[#232326] border-white/10 ml-2">
                  <div className="space-y-3">
                    <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Canvas Color</p>
                    <div className="grid grid-cols-4 gap-2">
                      {colors.map(color => (
                        <button key={color} onClick={() => setCanvasColor(color)} className="w-8 h-8 rounded-full border border-white/10" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <div className="flex items-center gap-2 pt-2 border-t border-white/10">
                      <input 
                        type="color" 
                        value={canvasColor} 
                        onChange={(e) => setCanvasColor(e.target.value)}
                        className="w-8 h-8 p-0 border-0 rounded overflow-hidden cursor-pointer bg-transparent"
                      />
                      <span className="text-xs text-white/60">Custom Color</span>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>
              <TooltipContent side="right">Canvas Color</TooltipContent>
            </Tooltip>

            <button className="w-10 h-10 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors">
              <Palette className="w-5 h-5" />
            </button>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};
