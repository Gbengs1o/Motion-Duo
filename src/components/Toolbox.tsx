"use client";

import React from 'react';
import { Pencil, Eraser, Square, Circle, Type, Palette, MousePointer2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const tools = [
  { id: 'select', icon: MousePointer2, label: 'Select' },
  { id: 'pencil', icon: Pencil, label: 'Pencil' },
  { id: 'eraser', icon: Eraser, label: 'Eraser' },
  { id: 'square', icon: Square, label: 'Shape' },
  { id: 'circle', icon: Circle, label: 'Circle' },
  { id: 'text', icon: Type, label: 'Text' },
];

export const Toolbox: React.FC = () => {
  const [activeTool, setActiveTool] = React.useState('pencil');

  return (
    <div className="w-16 h-full bg-[#232326] border-r border-white/5 flex flex-col items-center py-6 gap-6 shrink-0">
      <div className="flex flex-col gap-2">
        {tools.map((tool) => (
          <Tooltip key={tool.id}>
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
            <TooltipContent side="right">
              <p className="text-xs">{tool.label}</p>
            </TooltipContent>
          </Tooltip>
        ))}
      </div>

      <div className="mt-auto flex flex-col items-center gap-4">
        <button className="w-8 h-8 rounded-full bg-primary border-2 border-white/20 shadow-inner" />
        <button className="w-8 h-8 rounded-full bg-accent border-2 border-white/20 shadow-inner" />
        <button className="w-10 h-10 flex items-center justify-center rounded-xl text-white/40 hover:text-white transition-colors">
          <Palette className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
};