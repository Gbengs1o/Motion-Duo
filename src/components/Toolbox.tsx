
"use client";

import React from 'react';
import { 
  Pencil, 
  Eraser, 
  Type, 
  Palette, 
  MousePointer2, 
  Shapes, 
  PaintBucket, 
  Spline,
  Square,
  Circle,
  Triangle,
  Hexagon
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';

const tools = [
  { id: 'select', icon: MousePointer2, label: 'Transform Tool' },
  { id: 'pen', icon: Pencil, label: 'Pen Tool' },
  { id: 'vector', icon: Spline, label: 'Vector Editing Tool' },
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
  primaryColor: string;
  setPrimaryColor: (color: string) => void;
  canvasColor: string;
  setCanvasColor: (color: string) => void;
}

export const Toolbox: React.FC<ToolboxProps> = ({ 
  className, 
  activeTool, 
  setActiveTool,
  activeShape,
  setActiveShape,
  primaryColor,
  setPrimaryColor,
  canvasColor,
  setCanvasColor
}) => {
  return (
    <div className={className || "w-16 h-full bg-[#232326] border-r border-white/5 flex flex-col items-center py-6 gap-6 shrink-0"}>
      <div className="flex flex-col gap-2">
        {tools.map((tool) => (
          <Tooltip key={tool.id}>
            {tool.id === 'shape' ? (
              <Popover>
                <PopoverTrigger asChild>
                  <TooltipTrigger asChild>
                    <button
                      className={cn(
                        "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 relative",
                        activeTool === tool.id 
                          ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" 
                          : "text-white/40 hover:text-white hover:bg-white/5"
                      )}
                    >
                      <tool.icon className="w-5 h-5" />
                    </button>
                  </TooltipTrigger>
                </PopoverTrigger>
                <PopoverContent side="right" className="w-40 bg-[#232326] border-white/10 p-2 ml-2">
                  <div className="grid grid-cols-2 gap-2">
                    {shapeOptions.map((shape) => (
                      <button
                        key={shape.id}
                        onClick={() => {
                          setActiveTool('shape');
                          setActiveShape(shape.id);
                        }}
                        className={cn(
                          "flex flex-col items-center gap-1 p-2 rounded-lg transition-colors",
                          activeShape === shape.id && activeTool === 'shape'
                            ? "bg-primary/20 text-primary"
                            : "text-white/60 hover:bg-white/5 hover:text-white"
                        )}
                      >
                        <shape.icon className="w-5 h-5" />
                        <span className="text-[10px] uppercase font-bold">{shape.id}</span>
                      </button>
                    ))}
                  </div>
                </PopoverContent>
              </Popover>
            ) : (
              <TooltipTrigger asChild>
                <button
                  onClick={() => setActiveTool(tool.id)}
                  className={cn(
                    "w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200",
                    activeTool === tool.id 
                      ? "bg-primary text-white shadow-lg shadow-primary/20 scale-110" 
                      : "text-white/40 hover:text-white hover:bg-white/5"
                  )}
                >
                  <tool.icon className="w-5 h-5" />
                </button>
              </TooltipTrigger>
            )}
            <TooltipContent side="right">
              <p className="text-xs">{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-4 pb-4">
        {/* Primary Color Picker */}
        <Tooltip>
          <Popover>
            <PopoverTrigger asChild>
              <TooltipTrigger asChild>
                <button 
                  className="w-8 h-8 rounded-full border-2 border-white/20 shadow-inner transition-transform hover:scale-110" 
                  style={{ backgroundColor: primaryColor }}
                />
              </TooltipTrigger>
            </PopoverTrigger>
            <PopoverContent side="right" className="w-48 bg-[#232326] border-white/10 ml-2">
              <div className="space-y-3">
                <p className="text-[10px] uppercase font-bold text-white/40 tracking-widest">Shape Color</p>
                <div className="grid grid-cols-4 gap-2">
                  {colors.map(color => (
                    <button 
                      key={color} 
                      onClick={() => setPrimaryColor(color)}
                      className="w-8 h-8 rounded-full border border-white/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
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
                <button 
                  className="w-8 h-8 rounded-full border-2 border-white/20 shadow-inner transition-transform hover:scale-110 relative overflow-hidden" 
                  style={{ backgroundColor: canvasColor }}
                >
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
                    <button 
                      key={color} 
                      onClick={() => setCanvasColor(color)}
                      className="w-8 h-8 rounded-full border border-white/10"
                      style={{ backgroundColor: color }}
                    />
                  ))}
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
  );
};
