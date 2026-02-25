"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Layer } from '@/app/lib/motion-duo-types';
import { 
  Eye, 
  EyeOff, 
  Lock, 
  Unlock, 
  Image as ImageIcon, 
  Plus, 
  Trash2, 
  Copy, 
  ChevronUp, 
  ChevronDown 
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidePanelProps {
  description: string;
  setDescription: (val: string) => void;
  layers: Layer[];
  activeLayerId: string;
  setActiveLayerId: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  onImport: () => void;
  className?: string;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  description,
  setDescription,
  layers,
  activeLayerId,
  setActiveLayerId,
  onToggleVisibility,
  onToggleLock,
  onAddLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onMoveLayer,
  onImport,
  className,
}) => {
  return (
    <div className={className || "w-[320px] h-full bg-[#232326] border-l border-white/5 flex flex-col shrink-0"}>
      <Tabs defaultValue="text" className="w-full flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 h-14 border-b border-white/5 rounded-none shrink-0">
          <TabsTrigger value="text" className="data-[state=active]:bg-white/5 rounded-none h-full text-[10px] uppercase tracking-tighter">Description</TabsTrigger>
          <TabsTrigger value="layers" className="data-[state=active]:bg-white/5 rounded-none h-full text-[10px] uppercase tracking-tighter">Layers</TabsTrigger>
          <TabsTrigger value="media" className="data-[state=active]:bg-white/5 rounded-none h-full text-[10px] uppercase tracking-tighter">Media</TabsTrigger>
        </TabsList>

        <TabsContent value="text" className="flex-1 m-0 p-4 space-y-4 flex flex-col min-h-0 data-[state=inactive]:hidden">
          <div className="space-y-1">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Description</h3>
            <p className="text-[11px] text-white/50 leading-relaxed">Describe the motion, physics, and interactions of your sketch. Switching to Motion mode will trigger synthesis.</p>
          </div>
          <Textarea 
            placeholder="e.g. The circle bounces against the walls like a bubble, changing colors as it hits..."
            className="flex-1 bg-black/20 border-white/5 focus-visible:ring-primary pro-scrollbar resize-none text-sm"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
        </TabsContent>

        <TabsContent value="layers" className="flex-1 m-0 flex flex-col p-4 min-h-0 data-[state=inactive]:hidden">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Layers</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="ghost" 
                  size="icon" 
                  className="h-6 w-6 text-white/40 hover:text-white"
                  onClick={onAddLayer}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>New Layer</TooltipContent>
            </Tooltip>
          </div>
          
          <ScrollArea className="flex-1 pr-2 pro-scrollbar">
            <div className="space-y-2 pb-4">
              {layers.map((layer, index) => (
                <div 
                  key={layer.id} 
                  onClick={() => setActiveLayerId(layer.id)}
                  className={cn(
                    "group flex flex-col gap-2 p-3 bg-white/5 rounded-lg border transition-all cursor-pointer",
                    activeLayerId === layer.id ? "border-primary/50 bg-primary/5 ring-1 ring-primary/20" : "border-white/5 hover:border-white/10"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded bg-black/20 flex items-center justify-center shrink-0">
                      <ImageIcon className={cn("w-4 h-4", activeLayerId === layer.id ? "text-primary" : "text-white/20")} />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className={cn("text-xs font-medium truncate", activeLayerId === layer.id && "text-white")}>{layer.name}</p>
                      <p className="text-[9px] text-white/40 uppercase tracking-tighter">{layer.type}</p>
                    </div>
                    <div className="flex gap-0.5">
                      <button 
                        onClick={(e) => { e.stopPropagation(); onToggleVisibility(layer.id); }}
                        className="p-1 hover:text-primary transition-colors text-white/40"
                      >
                        {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onToggleLock(layer.id); }}
                        className="p-1 hover:text-primary transition-colors text-white/40"
                      >
                        {layer.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                  
                  {activeLayerId === layer.id && (
                    <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1">
                      <div className="flex gap-1">
                        <button 
                          disabled={index === 0}
                          onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.id, 'up'); }}
                          className="p-1 hover:bg-white/10 rounded text-white/30 hover:text-white disabled:opacity-20"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          disabled={index === layers.length - 1}
                          onClick={(e) => { e.stopPropagation(); onMoveLayer(layer.id, 'down'); }}
                          className="p-1 hover:bg-white/10 rounded text-white/30 hover:text-white disabled:opacity-20"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </div>
                      <div className="flex gap-1">
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDuplicateLayer(layer.id); }}
                          className="p-1 hover:bg-white/10 rounded text-white/30 hover:text-white"
                        >
                          <Copy className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); onDeleteLayer(layer.id); }}
                          className="p-1 hover:bg-destructive/20 rounded text-white/30 hover:text-destructive"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>

        <TabsContent value="media" className="flex-1 m-0 p-4 flex flex-col items-center justify-center space-y-4 data-[state=inactive]:hidden">
          <div className="text-center space-y-2 max-w-[200px]">
            <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2">
              <ImageIcon className="w-6 h-6 text-white/10" />
            </div>
            <p className="text-xs font-medium">No assets imported</p>
            <p className="text-[10px] text-white/40">Import SVG or Image files to use as references.</p>
          </div>
          <Button 
            variant="outline" 
            className="w-full border-white/10 hover:bg-white/5 mt-2 h-9 text-xs"
            onClick={onImport}
          >
            Import Media
          </Button>
        </TabsContent>
      </Tabs>
    </div>
  );
};