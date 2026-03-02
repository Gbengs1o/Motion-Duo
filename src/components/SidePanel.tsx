"use client";

import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Layer, MediaAsset, GenerationHistoryItem } from '@/app/lib/motion-duo-types';
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
  ChevronDown,
  Edit2,
  History,
  RotateCcw,
  RotateCw,
  Activity
} from 'lucide-react';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

interface SidePanelProps {
  layers: Layer[];
  activeLayerId: string;
  setActiveLayerId: (id: string) => void;
  onToggleVisibility: (id: string) => void;
  onToggleLock: (id: string) => void;
  onAddLayer: () => void;
  onDeleteLayer: (id: string) => void;
  onDuplicateLayer: (id: string) => void;
  onMoveLayer: (id: string, direction: 'up' | 'down') => void;
  mediaAssets: MediaAsset[];
  onImport: () => void;
  onRenameMedia: (id: string, newName: string) => void;
  onDeleteMedia: (id: string) => void;
  onAddMediaToCanvas: (asset: MediaAsset) => void;
  generationHistory?: GenerationHistoryItem[];
  onRevertToHistory?: (item: GenerationHistoryItem) => void;
  currentMotionHtml?: string | null;
  currentDescription?: string;
  onRestorePresent?: () => void;
  activeTab: string;
  onTabChange: (tab: string) => void;
  className?: string;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  layers,
  activeLayerId,
  setActiveLayerId,
  onToggleVisibility,
  onToggleLock,
  onAddLayer,
  onDeleteLayer,
  onDuplicateLayer,
  onMoveLayer,
  mediaAssets,
  onImport,
  onRenameMedia,
  onDeleteMedia,
  onAddMediaToCanvas,
  generationHistory = [],
  onRevertToHistory,
  currentMotionHtml,
  currentDescription,
  onRestorePresent,
  activeTab,
  onTabChange,
  className,
}) => {
  return (
    <div className={className || "w-[320px] h-full bg-[#232326] border-l border-white/5 flex flex-col shrink-0"}>
      <Tabs value={activeTab} onValueChange={onTabChange} className="w-full flex flex-col h-full">
        <TabsList className="grid w-full grid-cols-3 bg-transparent p-0 h-14 border-b border-white/5 rounded-none shrink-0">
          <TabsTrigger value="layers" className="data-[state=active]:bg-white/5 rounded-none h-full text-[10px] uppercase tracking-tighter">Layers</TabsTrigger>
          <TabsTrigger value="media" className="data-[state=active]:bg-white/5 rounded-none h-full text-[10px] uppercase tracking-tighter">Media</TabsTrigger>
          <TabsTrigger value="history" className="data-[state=active]:bg-white/5 rounded-none h-full text-[10px] uppercase tracking-tighter">History</TabsTrigger>
        </TabsList>

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

        <TabsContent value="media" className="flex-1 m-0 flex flex-col p-4 min-h-0 data-[state=inactive]:hidden">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Media Library</h3>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 text-white/40 hover:text-white"
                  onClick={onImport}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Import Media</TooltipContent>
            </Tooltip>
          </div>

          <ScrollArea className="flex-1 pr-2 pro-scrollbar">
            {mediaAssets.length === 0 ? (
              <div className="text-center space-y-2 mt-10 max-w-[200px] mx-auto">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2">
                  <ImageIcon className="w-6 h-6 text-white/10" />
                </div>
                <p className="text-xs font-medium">No assets imported</p>
                <p className="text-[10px] text-white/40">Import SVG or Image files to use as references.</p>
              </div>
            ) : (
              <div className="space-y-2 pb-4">
                {mediaAssets.map(asset => (
                  <div
                    key={asset.id}
                    className="group flex flex-col gap-2 p-3 bg-white/5 rounded-lg border border-white/5 hover:border-white/10 transition-all"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded bg-black/40 flex items-center justify-center shrink-0 overflow-hidden relative">
                        {asset.type === 'image' || asset.type === 'svg' ? (
                          <img src={asset.url} alt={asset.name} className="object-cover w-full h-full" />
                        ) : (
                          <ImageIcon className="w-4 h-4 text-white/20" />
                        )}
                      </div>
                      <div className="flex-1 overflow-hidden">
                        <input
                          value={asset.name}
                          onChange={(e) => onRenameMedia(asset.id, e.target.value)}
                          className="w-full bg-transparent border-none p-0 text-xs font-medium text-white focus:ring-0 placeholder:text-white/30 truncate focus:outline-none"
                          placeholder="Unnamed Asset"
                        />
                        <p className="text-[9px] text-white/40 uppercase tracking-tighter mt-0.5">{asset.type}</p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between border-t border-white/5 pt-2 mt-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-6 px-2 text-[10px] bg-white/5 hover:bg-white/10 text-white/70"
                        onClick={() => onAddMediaToCanvas(asset)}
                      >
                        Add to Canvas
                      </Button>
                      <button
                        onClick={() => onDeleteMedia(asset.id)}
                        className="p-1 hover:bg-destructive/20 rounded text-white/30 hover:text-destructive"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>

        <TabsContent value="history" className="flex-1 m-0 flex flex-col p-4 min-h-0 data-[state=inactive]:hidden">
          <div className="flex justify-between items-center mb-4 shrink-0">
            <h3 className="text-[10px] font-bold text-muted-foreground uppercase tracking-widest">Generation History</h3>
          </div>

          <ScrollArea className="flex-1 pr-2 pro-scrollbar">
            {generationHistory.length === 0 ? (
              <div className="text-center space-y-2 mt-10 max-w-[200px] mx-auto">
                <div className="w-12 h-12 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-2">
                  <History className="w-6 h-6 text-white/10" />
                </div>
                <p className="text-xs font-medium text-white/60">No history yet</p>
                <p className="text-[10px] text-white/40">Generate your first animation to start tracking versions.</p>
              </div>
            ) : (
              <div className="space-y-4 pb-4">
                {/* Present Code / Current Workspace Block */}
                {currentMotionHtml && (
                  <div className="group flex flex-col gap-3 p-3 bg-primary/5 rounded-xl border border-primary/20 transition-all">
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-white bg-primary px-1.5 py-0.5 rounded">PRESENT</span>
                          <span className="text-[9px] text-primary/60 tracking-widest uppercase font-mono">Current State</span>
                        </div>
                        <p className="text-xs text-white/80 line-clamp-2 leading-relaxed" title={currentDescription}>
                          "{currentDescription || "Unsaved changes"}"
                        </p>
                      </div>
                    </div>
                    <div className="w-full aspect-video bg-black/40 rounded-lg overflow-hidden relative border border-white/5 group">
                      <div className="absolute inset-0 origin-top-left pointer-events-none" style={{ width: '400%', height: '400%', transform: 'scale(0.25)' }}>
                        <iframe title="current-workspace" srcDoc={currentMotionHtml} className="w-full h-full border-0" sandbox="allow-scripts" scrolling="no" />
                      </div>

                      {/* Overlay to allow jumping back to present */}
                      <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 bg-black/60 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                        <Button
                          size="sm"
                          className="bg-white hover:bg-white/90 text-black border-none shadow-xl gap-2 font-bold"
                          onClick={() => onRestorePresent?.()}
                        >
                          <RotateCw className="w-3.5 h-3.5" />
                          Return to Present
                        </Button>
                      </div>
                    </div>
                  </div>
                )}

                {/* Historic Generations */}
                {generationHistory.map((item, index) => (
                  <div
                    key={item.id}
                    className="group flex flex-col gap-3 p-3 bg-white/5 rounded-xl border border-white/5 hover:border-primary/30 hover:bg-white/10 transition-all"
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div className="flex-1 overflow-hidden">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded">V.{generationHistory.length - index}</span>
                          <span className="text-[9px] text-white/40 tracking-widest uppercase font-mono">{item.timestamp}</span>
                        </div>
                        <p className="text-xs text-white/80 line-clamp-2 leading-relaxed" title={item.description}>
                          "{item.description}"
                        </p>
                      </div>
                    </div>

                    {/* Live Thumbnail Preview */}
                    <div className="w-full aspect-video bg-black/40 rounded-lg overflow-hidden relative border border-white/5 group-hover:border-primary/20 transition-colors">
                      <div
                        className="absolute inset-0 origin-top-left pointer-events-none"
                        style={{
                          width: '400%', // Scale down by 4 (1/0.25)
                          height: '400%',
                          transform: 'scale(0.25)',
                        }}
                      >
                        <iframe
                          title={item.id}
                          srcDoc={item.htmlCode}
                          className="w-full h-full border-0"
                          sandbox="allow-scripts"
                          scrolling="no"
                        />
                      </div>

                      {/* Overlay to catch clicks instead of interacting with the iframe */}
                      <div className="absolute inset-0 z-10 opacity-0 group-hover:opacity-100 bg-black/60 flex items-center justify-center transition-opacity backdrop-blur-[2px]">
                        <Button
                          size="sm"
                          className="bg-primary hover:bg-primary text-white shadow-xl gap-2 font-semibold"
                          onClick={() => onRevertToHistory?.(item)}
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          Restore
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
};