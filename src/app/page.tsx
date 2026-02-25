"use client";

import React, { useState, useCallback } from 'react';
import { AppMode, Layer, VectorElement } from '@/app/lib/motion-duo-types';
import { ModeSwitch } from '@/components/ModeSwitch';
import { Toolbox } from '@/components/Toolbox';
import { CanvasWorkspace } from '@/components/CanvasWorkspace';
import { SidePanel } from '@/components/SidePanel';
import { BottomControls } from '@/components/BottomControls';
import { MediaModal } from '@/components/MediaModal';
import { generateMotionGraphics } from '@/ai/flows/generate-motion-graphics-from-sketch-and-text-flow';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu, Layers as LayersIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export default function MotionDuoApp() {
  const [appMode, setAppMode] = useState<AppMode>('sketch');
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [motionHtml, setMotionHtml] = useState<string | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  
  // Vector Tool States
  const [activeTool, setActiveTool] = useState('pen');
  const [activeShape, setActiveShape] = useState('rect');
  const [primaryColor, setPrimaryColor] = useState('#806CE0');
  const [canvasColor, setCanvasColor] = useState('#121214');

  const [elements, setElements] = useState<VectorElement[]>([]);
  const [layers, setLayers] = useState<Layer[]>([
    { id: 'l1', name: 'Background Layer', type: 'sketch', visible: true, locked: false },
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>('l1');

  const { toast } = useToast();

  const handleModeToggle = (mode: AppMode) => {
    if (mode === 'motion' && appMode === 'sketch') {
      triggerMotionSynthesis();
    } else {
      setAppMode(mode);
    }
  };

  const triggerMotionSynthesis = async () => {
    const canvas = document.querySelector('canvas');
    const dataUri = canvas?.toDataURL('image/png') || '';
    
    setIsLoading(true);
    setAppMode('motion');
    try {
      const result = await generateMotionGraphics({
        canvasDataUri: dataUri,
        description: description || "Generate a smooth animation based on the elements in the sketch.",
      });
      setMotionHtml(result.htmlCssMotionGraphics);
    } catch (error) {
      toast({
        title: "Synthesis Failed",
        description: "The AI model encountered an error generating your animation.",
        variant: "destructive",
      });
      setAppMode('sketch');
    } finally {
      setIsLoading(false);
    }
  };

  const handleToggleVisibility = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, visible: !l.visible } : l));
  };

  const handleToggleLock = (id: string) => {
    setLayers(prev => prev.map(l => l.id === id ? { ...l, locked: !l.locked } : l));
  };

  const handleAddLayer = () => {
    const id = `l-${Math.random().toString(36).substr(2, 9)}`;
    const newLayer: Layer = {
      id,
      name: `Layer ${layers.length + 1}`,
      type: 'sketch',
      visible: true,
      locked: false,
    };
    setLayers(prev => [newLayer, ...prev]);
    setActiveLayerId(id);
  };

  const handleDeleteLayer = (id: string) => {
    if (layers.length <= 1) {
      toast({ title: "Operation Denied", description: "You must have at least one layer." });
      return;
    }
    setLayers(prev => prev.filter(l => l.id !== id));
    setElements(prev => prev.filter(el => el.layerId !== id));
    if (activeLayerId === id) {
      setActiveLayerId(layers.find(l => l.id !== id)?.id || '');
    }
  };

  const handleDuplicateLayer = (id: string) => {
    const source = layers.find(l => l.id === id);
    if (!source) return;

    const newId = `l-${Math.random().toString(36).substr(2, 9)}`;
    const newLayer: Layer = {
      ...source,
      id: newId,
      name: `${source.name} Copy`,
    };

    const sourceElements = elements.filter(el => el.layerId === id);
    const duplicatedElements = sourceElements.map(el => ({
      ...el,
      id: `el-${Math.random().toString(36).substr(2, 9)}`,
      layerId: newId,
      x: (el.x || 0) + 10,
      y: (el.y || 0) + 10,
      points: el.points?.map(p => ({ x: p.x + 10, y: p.y + 10 }))
    }));

    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      const next = [...prev];
      next.splice(idx, 0, newLayer);
      return next;
    });
    setElements(prev => [...prev, ...duplicatedElements]);
    setActiveLayerId(newId);
  };

  const handleMoveLayer = (id: string, direction: 'up' | 'down') => {
    setLayers(prev => {
      const idx = prev.findIndex(l => l.id === id);
      if (idx === -1) return prev;
      if (direction === 'up' && idx === 0) return prev;
      if (direction === 'down' && idx === prev.length - 1) return prev;

      const next = [...prev];
      const targetIdx = direction === 'up' ? idx - 1 : idx + 1;
      [next[idx], next[targetIdx]] = [next[targetIdx], next[idx]];
      return next;
    });
  };

  const handleImportConfirm = (name: string) => {
    const id = `l-${Math.random().toString(36).substr(2, 9)}`;
    const newLayer: Layer = {
      id,
      name,
      type: 'image',
      visible: true,
      locked: false,
    };
    setLayers(prev => [newLayer, ...prev]);
    setActiveLayerId(id);
    toast({
      title: "Asset Imported",
      description: `${name} has been added to your layers.`,
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden text-foreground bg-background">
      <ModeSwitch 
        mode={appMode} 
        setMode={handleModeToggle} 
        isSidePanelOpen={isSidePanelOpen}
        onToggleSidePanel={() => setIsSidePanelOpen(!isSidePanelOpen)}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Toolbox 
          className="hidden md:flex w-16 h-full bg-[#232326] border-r border-white/5 flex-col items-center py-6 gap-6 shrink-0" 
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          activeShape={activeShape}
          setActiveShape={setActiveShape}
          primaryColor={primaryColor}
          setPrimaryColor={setPrimaryColor}
          canvasColor={canvasColor}
          setCanvasColor={setCanvasColor}
        />

        <main className="flex-1 relative flex flex-col min-w-0">
          <CanvasWorkspace 
            appMode={appMode} 
            isLoading={isLoading} 
            motionHtml={motionHtml}
            activeTool={activeTool}
            activeShape={activeShape}
            primaryColor={primaryColor}
            canvasColor={canvasColor}
            elements={elements}
            setElements={setElements}
            layers={layers}
            activeLayerId={activeLayerId}
          />
          <BottomControls 
            appMode={appMode} 
            onUndo={() => {}} 
            onRedo={() => {}} 
          />

          <div className="absolute top-4 right-4 flex flex-col gap-2 md:hidden">
            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="secondary" className="rounded-full shadow-lg h-10 w-10 bg-[#232326] border border-white/10">
                  <LayersIcon className="w-5 h-5 text-primary" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="p-0 bg-[#232326] border-white/5 w-[280px]">
                <SheetHeader className="sr-only">
                  <SheetTitle>Layers and Settings</SheetTitle>
                </SheetHeader>
                <SidePanel 
                  description={description}
                  setDescription={setDescription}
                  layers={layers}
                  activeLayerId={activeLayerId}
                  setActiveLayerId={setActiveLayerId}
                  onToggleVisibility={handleToggleVisibility}
                  onToggleLock={handleToggleLock}
                  onAddLayer={handleAddLayer}
                  onDeleteLayer={handleDeleteLayer}
                  onDuplicateLayer={handleDuplicateLayer}
                  onMoveLayer={handleMoveLayer}
                  onImport={() => setIsMediaModalOpen(true)}
                  className="w-full h-full flex flex-col"
                />
              </SheetContent>
            </Sheet>

            <Sheet>
              <SheetTrigger asChild>
                <Button size="icon" variant="secondary" className="rounded-full shadow-lg h-10 w-10 bg-[#232326] border border-white/10">
                  <Menu className="w-5 h-5 text-white" />
                </Button>
              </SheetTrigger>
              <SheetContent side="left" className="p-0 bg-[#232326] border-white/5 w-20">
                <SheetHeader className="sr-only">
                  <SheetTitle>Tools</SheetTitle>
                </SheetHeader>
                <Toolbox 
                  className="w-full h-full flex flex-col items-center py-6 gap-6" 
                  activeTool={activeTool}
                  setActiveTool={setActiveTool}
                  activeShape={activeShape}
                  setActiveShape={setActiveShape}
                  primaryColor={primaryColor}
                  setPrimaryColor={setPrimaryColor}
                  canvasColor={canvasColor}
                  setCanvasColor={setCanvasColor}
                />
              </SheetContent>
            </Sheet>
          </div>
        </main>

        <div 
          className={cn(
            "hidden md:flex flex-col h-full bg-[#232326] border-l border-white/5 transition-all duration-300 ease-in-out shrink-0 overflow-hidden",
            isSidePanelOpen ? "w-[320px]" : "w-0 border-l-0"
          )}
        >
          <SidePanel 
            description={description}
            setDescription={setDescription}
            layers={layers}
            activeLayerId={activeLayerId}
            setActiveLayerId={setActiveLayerId}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onAddLayer={handleAddLayer}
            onDeleteLayer={handleDeleteLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onMoveLayer={handleMoveLayer}
            onImport={() => setIsMediaModalOpen(true)}
            className="w-[320px] h-full flex flex-col"
          />
        </div>
      </div>

      <MediaModal 
        isOpen={isMediaModalOpen} 
        onClose={() => setIsMediaModalOpen(false)} 
        onConfirm={handleImportConfirm} 
      />
    </div>
  );
}