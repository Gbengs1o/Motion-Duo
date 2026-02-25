
"use client";

import React, { useState } from 'react';
import { AppMode, Layer } from '@/app/lib/motion-duo-types';
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

  const { toast } = useToast();

  const [layers, setLayers] = useState<Layer[]>([
    { id: 'l1', name: 'Vector Layer 1', type: 'sketch', visible: true, locked: false },
  ]);

  const handleModeToggle = (mode: AppMode) => {
    if (mode === 'motion' && appMode === 'sketch') {
      triggerMotionSynthesis();
    } else {
      setAppMode(mode);
    }
  };

  const triggerMotionSynthesis = async () => {
    const canvas = document.querySelector('canvas');
    const dataUri = canvas?.toDataURL('image/png') || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
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

  const handleImportConfirm = (name: string) => {
    const newLayer: Layer = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      type: 'image',
      visible: true,
      locked: false,
    };
    setLayers(prev => [...prev, newLayer]);
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
        {/* Desktop Toolbox */}
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
            onUndo={() => {}} 
            onRedo={() => {}}
            activeTool={activeTool}
            primaryColor={primaryColor}
            canvasColor={canvasColor}
          />
          <BottomControls 
            appMode={appMode} 
            onUndo={() => {}} 
            onRedo={() => {}} 
          />

          {/* Mobile floating tool triggers */}
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
                  onToggleVisibility={handleToggleVisibility}
                  onToggleLock={handleToggleLock}
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

        {/* Desktop Side Panel */}
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
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
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
