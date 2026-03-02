"use client";

import React, { useState, useCallback, useEffect } from 'react';
import { AppMode, Layer, VectorElement, GenerationHistoryItem } from '@/app/lib/motion-duo-types';
import { ModeSwitch } from '@/components/ModeSwitch';
import { Toolbox } from '@/components/Toolbox';
import { CanvasWorkspace } from '@/components/CanvasWorkspace';
import { SidePanel } from '@/components/SidePanel';
import { BottomControls } from '@/components/BottomControls';
import { MediaModal } from '@/components/MediaModal';
import { generateMotionGraphics } from '@/ai/flows/generate-motion-graphics-from-sketch-and-text-flow';
import { FloatingDescriptionBox } from '@/components/FloatingDescriptionBox';
import { DescriptionRequirementModal } from '@/components/DescriptionRequirementModal';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu, Layers as LayersIcon, MessageSquareText, Edit3 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHistory } from '@/hooks/use-history';

export default function MotionDuoApp() {
  const [appMode, setAppMode] = useState<AppMode>('sketch');
  const [isLoading, setIsLoading] = useState(true);
  const [description, setDescription] = useState('');
  const [motionHtml, setMotionHtml] = useState<string | null>(null);
  const [isMediaModalOpen, setIsMediaModalOpen] = useState(false);
  const [isSidePanelOpen, setIsSidePanelOpen] = useState(true);
  const [activePanelTab, setActivePanelTab] = useState('layers');
  const [isDescriptionBoxOpen, setIsDescriptionBoxOpen] = useState(false);
  const [showRequirementModal, setShowRequirementModal] = useState(false);
  const [generationHistory, setGenerationHistory] = useState<GenerationHistoryItem[]>([]);
  const [latestMotionHtml, setLatestMotionHtml] = useState<string | null>(null);
  const [latestDescription, setLatestDescription] = useState<string>('');

  // Initial loading timeout
  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLoading(false);
    }, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Vector Tool States
  const [activeTool, setActiveTool] = useState('pen');
  const [activeShape, setActiveShape] = useState('rect');
  const [eraserMode, setEraserMode] = useState<'object' | 'precise'>('object');
  const [primaryColor, setPrimaryColor] = useState('#806CE0');
  const [canvasColor, setCanvasColor] = useState('#121214');

  const {
    state: elements,
    setState: setElements,
    undo,
    redo
  } = useHistory<VectorElement[]>([]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        undo();
      } else if ((e.ctrlKey || e.metaKey) && (e.key === 'y' || (e.shiftKey && e.key === 'z'))) {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [undo, redo]);

  const [layers, setLayers] = useState<Layer[]>([
    { id: 'l1', name: 'Background Layer', type: 'sketch', visible: true, locked: false },
  ]);
  const [activeLayerId, setActiveLayerId] = useState<string>('l1');

  // Media Library State
  const [mediaAssets, setMediaAssets] = useState<import('@/app/lib/motion-duo-types').MediaAsset[]>([]);

  const handleRenameMedia = (id: string, newName: string) => {
    setMediaAssets(prev => prev.map(m => m.id === id ? { ...m, name: newName } : m));
  };

  const handleDeleteMedia = (id: string) => {
    setMediaAssets(prev => prev.filter(m => m.id !== id));
  };

  const handleAddMediaToCanvas = (asset: import('@/app/lib/motion-duo-types').MediaAsset) => {
    const layerId = `l-${Math.random().toString(36).substr(2, 9)}`;
    const newLayer: Layer = {
      id: layerId,
      name: asset.name,
      type: 'image',
      visible: true,
      locked: false,
    };

    const elementId = `el-${Math.random().toString(36).substr(2, 9)}`;
    const newElement: VectorElement = {
      id: elementId,
      type: 'image',
      imageUrl: asset.url,
      x: 100,
      y: 100,
      width: 200,
      height: 200,
      color: '#ffffff',
      layerId: layerId,
    };

    setLayers(prev => [newLayer, ...prev]);
    setElements(prev => [...prev, newElement]);
    setActiveLayerId(layerId);
    toast({
      title: "Added to Canvas",
      description: `${asset.name} has been added to your workspace.`,
    });
  };

  const { toast } = useToast();

  const handleModeToggle = (mode: AppMode) => {
    if (mode === 'motion' && appMode === 'sketch') {
      if (!description.trim()) {
        setIsDescriptionBoxOpen(true);
        setShowRequirementModal(true);
        return;
      }
      setIsSidePanelOpen(true);
      setActivePanelTab('history');
      triggerMotionSynthesis();
    } else {
      setAppMode(mode);
      setActivePanelTab('layers');
    }
  };

  const triggerMotionSynthesis = async () => {
    const canvas = document.querySelector('canvas');
    const dataUri = canvas?.toDataURL('image/jpeg', 0.5) || '';


    setIsLoading(true);
    setAppMode('motion');
    try {
      const result = await generateMotionGraphics({
        canvasDataUri: dataUri,
        description: description,
      });
      setMotionHtml(result.htmlCssMotionGraphics);

      const newItem: GenerationHistoryItem = {
        id: `gen-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        description: description,
        htmlCode: result.htmlCssMotionGraphics,
      };
      setGenerationHistory(prev => [newItem, ...prev]);
      setLatestMotionHtml(result.htmlCssMotionGraphics);
      setLatestDescription(description);
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

  const handleRefine = async (refinement: string) => {
    if (!motionHtml) return;

    setIsLoading(true);
    // Clear the description for the next chat message
    setDescription('');

    try {
      const result = await generateMotionGraphics({
        description: refinement,
        previousCode: motionHtml,
      });
      setMotionHtml(result.htmlCssMotionGraphics);

      const newItem: GenerationHistoryItem = {
        id: `refine-${Date.now()}`,
        timestamp: new Date().toLocaleTimeString(),
        description: refinement, // the edit prompt used
        htmlCode: result.htmlCssMotionGraphics,
      };
      setGenerationHistory(prev => [newItem, ...prev]);
      setLatestMotionHtml(result.htmlCssMotionGraphics);
      setLatestDescription(refinement);
    } catch (error: any) {
      console.error('[Refinement Error]', error);
      toast({
        title: "Refinement Failed",
        description: "Something went wrong while applying your edits.",
        variant: "destructive",
      });
      // Restore refinement text so user doesn't lose it
      setDescription(refinement);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRevertToHistory = (item: GenerationHistoryItem) => {
    setMotionHtml(item.htmlCode);
    setDescription(item.description);
    // Optionally switch to motion mode if not already (safeguard)
    setAppMode('motion');
    toast({
      title: "History Restored",
      description: "Reverted to a previous animation version.",
    });
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
    return id;
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

  const handleImportConfirm = (name: string, fileUrl: string) => {
    const assetId = `m-${Math.random().toString(36).substr(2, 9)}`;
    // Basic check for svg vs image based on URL (data URL base64 signature)
    const isSvg = fileUrl.startsWith('data:image/svg+xml');

    const newAsset: import('@/app/lib/motion-duo-types').MediaAsset = {
      id: assetId,
      name,
      url: fileUrl,
      type: isSvg ? 'svg' : 'image',
    };

    setMediaAssets(prev => [...prev, newAsset]);
    toast({
      title: "Asset Imported",
      description: `${name} has been added to your media library.`,
    });
  };

  return (
    <div className="flex flex-col h-[100dvh] w-screen overflow-hidden text-foreground bg-background">
      <ModeSwitch
        mode={appMode}
        setMode={handleModeToggle}
        isSidePanelOpen={isSidePanelOpen}
        onToggleSidePanel={() => setIsSidePanelOpen(!isSidePanelOpen)}
        isDescriptionBoxOpen={isDescriptionBoxOpen}
        onToggleDescriptionBox={() => setIsDescriptionBoxOpen(!isDescriptionBoxOpen)}
        onRetry={triggerMotionSynthesis}
      />

      <div className="flex flex-1 overflow-hidden relative">
        <Toolbox
          className="hidden md:flex w-16 h-full bg-[#232326] border-r border-white/5 flex-col items-center py-6 gap-6 shrink-0"
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          activeShape={activeShape}
          setActiveShape={setActiveShape}
          eraserMode={eraserMode}
          setEraserMode={setEraserMode}
          primaryColor={primaryColor}
          setPrimaryColor={setPrimaryColor}
          canvasColor={canvasColor}
          setCanvasColor={setCanvasColor}
        />

        <main className="flex-1 relative flex flex-col min-w-0">
          {isDescriptionBoxOpen && (
            <FloatingDescriptionBox
              description={description}
              setDescription={setDescription}
              onClose={() => setIsDescriptionBoxOpen(false)}
              onRefine={handleRefine}
              appMode={appMode}
            />
          )}
          <CanvasWorkspace
            appMode={appMode}
            isLoading={isLoading}
            motionHtml={motionHtml}
            activeTool={activeTool}
            activeShape={activeShape}
            eraserMode={eraserMode}
            primaryColor={primaryColor}
            canvasColor={canvasColor}
            elements={elements}
            setElements={setElements}
            layers={layers}
            activeLayerId={activeLayerId}
            onAddLayer={handleAddLayer}
          />
          <BottomControls
            appMode={appMode}
            onUndo={undo}
            onRedo={redo}
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
                  activeTab={activePanelTab}
                  onTabChange={setActivePanelTab}
                  layers={layers}
                  activeLayerId={activeLayerId}
                  setActiveLayerId={setActiveLayerId}
                  onToggleVisibility={handleToggleVisibility}
                  onToggleLock={handleToggleLock}
                  onAddLayer={handleAddLayer}
                  onDeleteLayer={handleDeleteLayer}
                  onDuplicateLayer={handleDuplicateLayer}
                  onMoveLayer={handleMoveLayer}
                  mediaAssets={mediaAssets}
                  onImport={() => setIsMediaModalOpen(true)}
                  onRenameMedia={handleRenameMedia}
                  onDeleteMedia={handleDeleteMedia}
                  onAddMediaToCanvas={handleAddMediaToCanvas}
                  generationHistory={generationHistory}
                  onRevertToHistory={handleRevertToHistory}
                  currentMotionHtml={latestMotionHtml}
                  currentDescription={latestDescription}
                  onRestorePresent={() => {
                    if (latestMotionHtml) {
                      setMotionHtml(latestMotionHtml);
                      setDescription(latestDescription);
                      toast({ title: "Present State Restored", description: "Jumped back to the latest generation." });
                    }
                  }}
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
                  eraserMode={eraserMode}
                  setEraserMode={setEraserMode}
                  primaryColor={primaryColor}
                  setPrimaryColor={setPrimaryColor}
                  canvasColor={canvasColor}
                  setCanvasColor={setCanvasColor}
                />
              </SheetContent>
            </Sheet>

            <Button
              size="icon"
              variant="secondary"
              className={cn(
                "rounded-full shadow-lg h-10 w-10 border transition-all",
                isDescriptionBoxOpen
                  ? "bg-primary border-primary text-primary-foreground"
                  : "bg-[#232326] border-white/10 text-white"
              )}
              onClick={() => setIsDescriptionBoxOpen(!isDescriptionBoxOpen)}
            >
              {appMode === 'motion' ? <Edit3 className="w-5 h-5" /> : <MessageSquareText className="w-5 h-5" />}
            </Button>
          </div>
        </main>

        <div
          className={cn(
            "hidden md:flex flex-col h-full bg-[#232326] border-l border-white/5 transition-all duration-300 ease-in-out shrink-0 overflow-hidden",
            isSidePanelOpen ? "w-[320px]" : "w-0 border-l-0"
          )}
        >
          <SidePanel
            layers={layers}
            activeLayerId={activeLayerId}
            setActiveLayerId={setActiveLayerId}
            onToggleVisibility={handleToggleVisibility}
            onToggleLock={handleToggleLock}
            onAddLayer={handleAddLayer}
            onDeleteLayer={handleDeleteLayer}
            onDuplicateLayer={handleDuplicateLayer}
            onMoveLayer={handleMoveLayer}
            mediaAssets={mediaAssets}
            onImport={() => setIsMediaModalOpen(true)}
            onRenameMedia={handleRenameMedia}
            onDeleteMedia={handleDeleteMedia}
            onAddMediaToCanvas={handleAddMediaToCanvas}
            className="w-[320px] h-full flex flex-col"
          />
        </div>
      </div>

      <MediaModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onConfirm={handleImportConfirm}
      />

      <DescriptionRequirementModal
        isOpen={showRequirementModal}
        onOpenChange={setShowRequirementModal}
        onConfirm={() => {
          setShowRequirementModal(false);
          // Small delay to ensure the floating box has mounted before trying to focus the textarea inside it
          setTimeout(() => {
            const textarea = document.querySelector('textarea[placeholder*="bounce"]');
            if (textarea instanceof HTMLTextAreaElement) textarea.focus();
          }, 100);
        }}
      />
    </div>
  );
}