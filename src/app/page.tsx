"use client";

import React, { useState, useEffect } from 'react';
import { AppMode, Layer } from '@/app/lib/motion-duo-types';
import { ModeSwitch } from '@/components/ModeSwitch';
import { Toolbox } from '@/components/Toolbox';
import { CanvasWorkspace } from '@/components/CanvasWorkspace';
import { SidePanel } from '@/components/SidePanel';
import { BottomControls } from '@/components/BottomControls';
import { MediaModal } from '@/components/MediaModal';
import { generateMotionGraphics } from '@/ai/flows/generate-motion-graphics-from-sketch-and-text-flow';
import { useToast } from '@/hooks/use-toast';

export default function MotionDuoApp() {
  const [appMode, setAppMode] = useState<AppMode>('sketch');
  const [isLoading, setIsLoading] = useState(false);
  const [description, setDescription] = useState('');
  const [motionHtml, setMotionHtml] = useState<string | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const { toast } = useToast();

  const [layers, setLayers] = useState<Layer[]>([
    { id: 'l1', name: 'Sketch Layer 1', type: 'sketch', visible: true, locked: false },
  ]);

  const handleModeToggle = (mode: AppMode) => {
    if (mode === 'motion' && appMode === 'sketch') {
      triggerMotionSynthesis();
    }
    setAppMode(mode);
  };

  const triggerMotionSynthesis = async () => {
    // In a real app, we'd grab the canvas data URI here.
    // Since we're in a high-level state machine, we use a placeholder canvas for the AI flow.
    const canvas = document.querySelector('canvas');
    const dataUri = canvas?.toDataURL('image/png') || 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==';
    
    setIsLoading(true);
    try {
      const result = await generateMotionGraphics({
        canvasDataUri: dataUri,
        description: description || "Generate a smooth animation based on the elements in the sketch.",
      });
      setMotionHtml(result.htmlCssMotionGraphics);
      setAppMode('motion');
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
    <div className="flex flex-col h-screen w-screen overflow-hidden text-foreground bg-background">
      <ModeSwitch mode={appMode} setMode={handleModeToggle} />

      <div className="flex flex-1 overflow-hidden">
        <Toolbox />

        <main className="flex-1 relative flex flex-col min-w-0">
          <CanvasWorkspace 
            appMode={appMode} 
            isLoading={isLoading} 
            motionHtml={motionHtml}
            onUndo={() => {}} 
            onRedo={() => {}}
          />
          <BottomControls 
            appMode={appMode} 
            onUndo={() => {}} 
            onRedo={() => {}} 
          />
        </main>

        <SidePanel 
          description={description}
          setDescription={setDescription}
          layers={layers}
          onToggleVisibility={handleToggleVisibility}
          onToggleLock={handleToggleLock}
          onGenerate={triggerMotionSynthesis}
          onImport={() => setIsMediaModalOpen(true)}
        />
      </div>

      <MediaModal 
        isOpen={isMediaModalOpen} 
        onClose={() => setIsMediaModalOpen(false)} 
        onConfirm={handleImportConfirm} 
      />
    </div>
  );
}