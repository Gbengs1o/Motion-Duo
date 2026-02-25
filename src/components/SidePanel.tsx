"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Layer } from '@/app/lib/motion-duo-types';
import { Eye, EyeOff, Lock, Unlock, Image as ImageIcon, Plus } from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';

interface SidePanelProps {
  description: string;
  setDescription: (val: string) => void;
  layers: Layer[];
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onImport: () => void;
  className?: string;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  description,
  setDescription,
  layers,
  onToggleVisibility,
  onToggleLock,
  onImport,
  className,
}) => {
  return (
    <div className={className || "w-[320px] h-full bg-[#232326] border-l border-white/5 flex flex-col shrink-0"}>
      <Tabs defaultValue="text" className="w-full flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 h-14 border-b border-white/5 rounded-none">
          <TabsTrigger value="text" className="data-[state=active]:bg-white/5 rounded-none h-full text-[10px] uppercase tracking-tighter">Prompt</TabsTrigger>
          <TabsTrigger value="layers" className="data-[state=active]:bg-white/5 rounded-none h-full text-[10px] uppercase tracking-tighter">Layers</TabsTrigger>
          <TabsTrigger value="media" className="data-[state=active]:bg-white/5 rounded-none h-full text-[10px] uppercase tracking-tighter">Media</TabsTrigger>
        </TabsList>

        <div className="flex-1 overflow-hidden p-4">
          <TabsContent value="text" className="h-full m-0 space-y-4 flex flex-col">
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

          <TabsContent value="layers" className="h-full m-0 flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Active Layers</h3>
              <Button variant="ghost" size="icon" className="h-6 w-6 text-white/40 hover:text-white">
                <Plus className="w-4 h-4" />
              </Button>
            </div>
            <ScrollArea className="flex-1 pr-2">
              <div className="space-y-2">
                {layers.map((layer) => (
                  <div key={layer.id} className="group flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-all">
                    <div className="w-8 h-8 rounded bg-black/20 flex items-center justify-center">
                      <ImageIcon className="w-4 h-4 text-white/20" />
                    </div>
                    <div className="flex-1 overflow-hidden">
                      <p className="text-xs font-medium truncate">{layer.name}</p>
                      <p className="text-[9px] text-white/40 uppercase tracking-tighter">{layer.type}</p>
                    </div>
                    <div className="flex gap-1">
                      <button 
                        onClick={() => onToggleVisibility(layer.id)}
                        className="p-1 hover:text-primary transition-colors text-white/40"
                      >
                        {layer.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                      </button>
                      <button 
                        onClick={() => onToggleLock(layer.id)}
                        className="p-1 hover:text-primary transition-colors text-white/40"
                      >
                        {layer.locked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </TabsContent>

          <TabsContent value="media" className="h-full m-0 flex flex-col items-center justify-center space-y-4">
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
        </div>
      </Tabs>
    </div>
  );
};