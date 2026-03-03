"use client";

import React, { useState, useCallback, useEffect, useRef } from 'react';
import { AppMode, Layer, VectorElement, GenerationHistoryItem, MediaAsset } from '@/app/lib/motion-duo-types';
import { ModeSwitch } from '@/components/ModeSwitch';
import { Toolbox } from '@/components/Toolbox';
import { CanvasWorkspace } from '@/components/CanvasWorkspace';
import { SidePanel } from '@/components/SidePanel';
import { BottomControls } from '@/components/BottomControls';
import { MediaModal } from '@/components/MediaModal';
import { generateMotionGraphics } from '@/ai/flows/generate-motion-graphics-from-sketch-and-text-flow';
import { FloatingDescriptionBox } from '@/components/FloatingDescriptionBox';
import { DescriptionRequirementModal } from '@/components/DescriptionRequirementModal';
import { RenderDialog, RenderRequest, RenderResolution } from '@/components/RenderDialog';
import { useToast } from '@/hooks/use-toast';
import { Sheet, SheetContent, SheetTrigger, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Menu, Layers as LayersIcon, MessageSquareText, Edit3, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { useHistory } from '@/hooks/use-history';

const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

const renderResolutionMap: Record<RenderResolution, { width: number; height: number }> = {
  '720p': { width: 1280, height: 720 },
  '1080p': { width: 1920, height: 1080 },
  square: { width: 1080, height: 1080 },
};

type RenderProgressUpdate = {
  percent: number;
  status: string;
};

const buildMotionRenderSrcDoc = (motionHtml: string, width: number, height: number) => {
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,height=device-height,initial-scale=1" />
    <style>
      html, body {
        margin: 0;
        width: 100%;
        height: 100%;
        overflow: hidden;
        background: transparent;
      }
      #render-stage {
        width: ${width}px;
        height: ${height}px;
        position: relative;
        overflow: hidden;
        background: transparent;
      }
      #motion-root {
        position: absolute;
        top: 0;
        left: 0;
        transform-origin: top left;
        will-change: transform;
      }
    </style>
    <script src="https://cdn.jsdelivr.net/npm/html2canvas@1.4.1/dist/html2canvas.min.js"></script>
  </head>
  <body>
    <div id="render-stage">
      <div id="motion-root">${motionHtml}</div>
    </div>
    <script>
      (function() {
        const CHANNEL = 'motion-duo-render';
        const renderStage = document.getElementById('render-stage');
        const motionRoot = document.getElementById('motion-root');

        const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
        const clampPercent = value => Math.max(0, Math.min(100, Number(value) || 0));
        const sendProgress = (id, percent, status) => {
          window.parent.postMessage({
            channel: CHANNEL,
            id,
            progress: {
              percent: clampPercent(percent),
              status: String(status || ''),
            },
          }, '*');
        };
        const getSafeDimension = (value, fallback) => {
          const parsed = Number(value);
          if (!Number.isFinite(parsed) || parsed <= 0) return fallback;
          return Math.round(parsed);
        };
        const applyRenderLayout = payload => {
          if (!renderStage || !motionRoot) {
            throw new Error('Render stage is not ready.');
          }

          const outputWidth = getSafeDimension(payload.width, ${width});
          const outputHeight = getSafeDimension(payload.height, ${height});
          const sourceWidth = getSafeDimension(payload.sourceWidth, outputWidth);
          const sourceHeight = getSafeDimension(payload.sourceHeight, outputHeight);

          renderStage.style.width = outputWidth + 'px';
          renderStage.style.height = outputHeight + 'px';

          motionRoot.style.width = sourceWidth + 'px';
          motionRoot.style.height = sourceHeight + 'px';

          const scale = Math.min(outputWidth / sourceWidth, outputHeight / sourceHeight);
          const scaledWidth = sourceWidth * scale;
          const scaledHeight = sourceHeight * scale;
          const offsetX = Math.round((outputWidth - scaledWidth) / 2);
          const offsetY = Math.round((outputHeight - scaledHeight) / 2);
          motionRoot.style.transform = 'translate(' + offsetX + 'px,' + offsetY + 'px) scale(' + scale + ')';

          return { outputWidth, outputHeight };
        };
        const blobToDataUrl = blob => new Promise((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(String(reader.result));
          reader.onerror = () => reject(new Error('Failed to encode render output.'));
          reader.readAsDataURL(blob);
        });

        const renderStillPng = async (requestId, payload) => {
          if (!renderStage || !motionRoot || !window.html2canvas) {
            throw new Error('Rendering engine not ready.');
          }
          sendProgress(requestId, 10, 'Preparing frame...');
          const { outputWidth, outputHeight } = applyRenderLayout(payload || {});
          await sleep(120);
          sendProgress(requestId, 35, 'Capturing frame...');
          const canvas = await window.html2canvas(renderStage, {
            backgroundColor: payload.includeBackground ? payload.backgroundColor : null,
            useCORS: true,
            scale: 1,
            width: outputWidth,
            height: outputHeight,
            windowWidth: outputWidth,
            windowHeight: outputHeight,
          });
          sendProgress(requestId, 90, 'Encoding PNG...');
          return canvas.toDataURL('image/png');
        };

        const selectVideoMimeType = () => {
          const candidates = ['video/mp4;codecs=h264', 'video/webm;codecs=vp9', 'video/webm'];
          if (!window.MediaRecorder || !window.MediaRecorder.isTypeSupported) {
            return candidates[2];
          }
          return candidates.find(candidate => window.MediaRecorder.isTypeSupported(candidate)) || candidates[2];
        };

        const renderVideo = async (requestId, payload) => {
          if (!renderStage || !motionRoot || !window.html2canvas) {
            throw new Error('Rendering engine not ready.');
          }
          if (!window.MediaRecorder) {
            throw new Error('Video rendering is not supported in this browser.');
          }

          const { outputWidth: width, outputHeight: height } = applyRenderLayout(payload || {});
          const fps = Math.max(12, Math.min(60, payload.frameRate || 30));
          const durationMs = Math.max(2000, Math.min(30000, (payload.durationSeconds || 6) * 1000));
          const totalFrames = Math.max(1, Math.round((durationMs / 1000) * fps));

          sendProgress(requestId, 5, 'Initializing video renderer...');
          const outputCanvas = document.createElement('canvas');
          outputCanvas.width = width;
          outputCanvas.height = height;
          const outputCtx = outputCanvas.getContext('2d', { alpha: !payload.includeBackground });
          if (!outputCtx) {
            throw new Error('Unable to initialize the video renderer.');
          }

          const stream = outputCanvas.captureStream(fps);
          const mimeType = selectVideoMimeType();
          const recorder = new MediaRecorder(stream, {
            mimeType,
            videoBitsPerSecond: 8_000_000,
          });

          const chunks = [];
          recorder.ondataavailable = event => {
            if (event.data && event.data.size > 0) {
              chunks.push(event.data);
            }
          };

          const stopPromise = new Promise((resolve, reject) => {
            recorder.onstop = resolve;
            recorder.onerror = event => reject(event.error || new Error('Video recorder failed.'));
          });

          sendProgress(requestId, 7, 'Recording video...');
          recorder.start(250);
          const frameIntervalMs = 1000 / fps;
          const start = performance.now();

          for (let frameIndex = 0; frameIndex < totalFrames; frameIndex += 1) {
            const frameCanvas = await window.html2canvas(renderStage, {
              backgroundColor: payload.includeBackground ? payload.backgroundColor : null,
              useCORS: true,
              scale: 1,
              width,
              height,
              windowWidth: width,
              windowHeight: height,
            });

            outputCtx.clearRect(0, 0, width, height);
            if (payload.includeBackground) {
              outputCtx.fillStyle = payload.backgroundColor || '#121214';
              outputCtx.fillRect(0, 0, width, height);
            }
            outputCtx.drawImage(frameCanvas, 0, 0, width, height);

            const frameProgress = 8 + ((frameIndex + 1) / totalFrames) * 82;
            sendProgress(requestId, frameProgress, 'Rendering frames ' + (frameIndex + 1) + '/' + totalFrames + '...');

            const targetElapsed = (frameIndex + 1) * frameIntervalMs;
            const actualElapsed = performance.now() - start;
            const delay = targetElapsed - actualElapsed;
            if (delay > 0) {
              await sleep(delay);
            }
          }

          sendProgress(requestId, 94, 'Encoding video...');
          recorder.stop();
          await stopPromise;

          const blob = new Blob(chunks, { type: mimeType });
          sendProgress(requestId, 99, 'Finalizing file...');
          return {
            dataUrl: await blobToDataUrl(blob),
            mimeType,
          };
        };

        window.addEventListener('message', async event => {
          const data = event.data;
          if (!data || data.channel !== CHANNEL || !data.id || !data.command) {
            return;
          }

          try {
            if (data.command === 'render-png') {
              const dataUrl = await renderStillPng(data.id, data.payload || {});
              sendProgress(data.id, 100, 'PNG export ready.');
              window.parent.postMessage({ channel: CHANNEL, id: data.id, ok: true, payload: { dataUrl, mimeType: 'image/png' } }, '*');
              return;
            }
            if (data.command === 'render-video') {
              const output = await renderVideo(data.id, data.payload || {});
              sendProgress(data.id, 100, 'Video export ready.');
              window.parent.postMessage({ channel: CHANNEL, id: data.id, ok: true, payload: output }, '*');
              return;
            }
            throw new Error('Unknown render command.');
          } catch (error) {
            const message = error instanceof Error ? error.message : String(error);
            window.parent.postMessage({ channel: CHANNEL, id: data.id, ok: false, error: message }, '*');
          }
        });

        window.parent.postMessage({ channel: CHANNEL, ready: true }, '*');
      })();
    </script>
  </body>
</html>`;
};

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
  const [attachedMediaIds, setAttachedMediaIds] = useState<string[]>([]);
  const [replayNonce, setReplayNonce] = useState(0);
  const [isRenderDialogOpen, setIsRenderDialogOpen] = useState(false);
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderStatus, setRenderStatus] = useState('Preparing renderer...');

  useEffect(() => {
    if (isRenderDialogOpen && !isRendering) {
      setRenderProgress(0);
      setRenderStatus('Choose settings, then click Render.');
    }
  }, [isRenderDialogOpen, isRendering]);

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
  const [mediaAssets, setMediaAssets] = useState<MediaAsset[]>([]);

  const handleRenameMedia = (id: string, newName: string) => {
    setMediaAssets(prev => prev.map(m => m.id === id ? { ...m, name: newName } : m));
  };

  const handleDeleteMedia = (id: string) => {
    setMediaAssets(prev => prev.filter(m => m.id !== id));
    setAttachedMediaIds(prev => prev.filter(attachedId => attachedId !== id));
  };

  const handleAddMediaToCanvas = (asset: MediaAsset) => {
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
  const recalibrationNotice =
    "Sorry, there are too many testers on this app right now, so things are a bit slow. Recalibrating servers to create your animation.";
  const recalibrationToastTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const recalibrationNoticeShownRef = useRef(false);

  const clearRecalibrationNoticeTimer = useCallback(() => {
    if (recalibrationToastTimeoutRef.current) {
      clearTimeout(recalibrationToastTimeoutRef.current);
      recalibrationToastTimeoutRef.current = null;
    }
  }, []);

  const scheduleRecalibrationNotice = useCallback(() => {
    clearRecalibrationNoticeTimer();
    recalibrationNoticeShownRef.current = false;
    recalibrationToastTimeoutRef.current = setTimeout(() => {
      recalibrationNoticeShownRef.current = true;
      toast({
        title: "Server Recalibration",
        description: recalibrationNotice,
      });
      recalibrationToastTimeoutRef.current = null;
    }, 4500);
  }, [clearRecalibrationNoticeTimer, toast]);

  useEffect(() => {
    return () => clearRecalibrationNoticeTimer();
  }, [clearRecalibrationNoticeTimer]);

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

    let dataUri = '';
    if (canvas instanceof HTMLCanvasElement) {
      dataUri = canvas.toDataURL('image/jpeg', 0.5);
    } else {
      const fallbackCanvas = document.createElement('canvas');
      fallbackCanvas.width = 2;
      fallbackCanvas.height = 2;
      const fallbackCtx = fallbackCanvas.getContext('2d');
      if (fallbackCtx) {
        fallbackCtx.fillStyle = canvasColor;
        fallbackCtx.fillRect(0, 0, fallbackCanvas.width, fallbackCanvas.height);
      }
      dataUri = fallbackCanvas.toDataURL('image/jpeg', 0.5);
      console.warn('[Motion Synthesis] Canvas not found, using fallback canvas snapshot.');
    }

    setIsLoading(true);
    setAppMode('motion');
    scheduleRecalibrationNotice();
    try {
      const mediaForPrompt = resolveMediaAssetsForPrompt(description);
      const requiredMediaNames = mediaAssets
        .filter(asset => attachedMediaIds.includes(asset.id))
        .map(asset => asset.name);
      const result = await generateMotionGraphics({
        canvasDataUri: dataUri,
        description: description,
        mediaAssets: mediaForPrompt.length > 0
          ? mediaForPrompt.map(({ name, url, type }) => ({ name, url, type }))
          : undefined,
        requiredMediaNames: requiredMediaNames.length > 0 ? requiredMediaNames : undefined,
      });
      if (result.systemNotice && !recalibrationNoticeShownRef.current) {
        toast({
          title: "Server Recalibration",
          description: result.systemNotice,
        });
      }
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
      const errorMessage = error instanceof Error
        ? error.message.replace(/^Synthesis Failed:\s*/i, '')
        : "The AI model encountered an error generating your animation.";
      toast({
        title: "Synthesis Failed",
        description: errorMessage,
        variant: "destructive",
      });
      setAppMode('sketch');
    } finally {
      clearRecalibrationNoticeTimer();
      setIsLoading(false);
    }
  };

  const resolveMediaAssetsForPrompt = useCallback((promptText: string) => {
    if (mediaAssets.length === 0) return [];

    const attachedSet = new Set(attachedMediaIds);
    const attachedAssets = mediaAssets.filter(asset => attachedSet.has(asset.id));
    if (attachedAssets.length > 0) return attachedAssets;

    const normalizedPrompt = promptText.toLowerCase();
    return mediaAssets.filter(asset => normalizedPrompt.includes(asset.name.toLowerCase()));
  }, [mediaAssets, attachedMediaIds]);

  const handleRefine = async (refinement: string) => {
    if (!motionHtml) return;

    setIsLoading(true);
    scheduleRecalibrationNotice();
    // Clear the description for the next chat message
    setDescription('');

    try {
      const mediaForPrompt = resolveMediaAssetsForPrompt(refinement);
      const requiredMediaNames = mediaAssets
        .filter(asset => attachedMediaIds.includes(asset.id))
        .map(asset => asset.name);
      const result = await generateMotionGraphics({
        description: refinement,
        previousCode: motionHtml,
        mediaAssets: mediaForPrompt.length > 0
          ? mediaForPrompt.map(({ name, url, type }) => ({ name, url, type }))
          : undefined,
        requiredMediaNames: requiredMediaNames.length > 0 ? requiredMediaNames : undefined,
      });
      if (result.systemNotice && !recalibrationNoticeShownRef.current) {
        toast({
          title: "Server Recalibration",
          description: result.systemNotice,
        });
      }
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
      const errorMessage = error instanceof Error
        ? error.message.replace(/^Synthesis Failed:\s*/i, '')
        : "Something went wrong while applying your edits.";
      toast({
        title: "Refinement Failed",
        description: errorMessage,
        variant: "destructive",
      });
      // Restore refinement text so user doesn't lose it
      setDescription(refinement);
    } finally {
      clearRecalibrationNoticeTimer();
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

  const downloadDataUrl = useCallback((dataUrl: string, filename: string) => {
    const anchor = document.createElement('a');
    anchor.href = dataUrl;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
  }, []);

  const renderMotionAsset = useCallback(async (
    request: RenderRequest,
    html: string,
    onProgress?: (update: RenderProgressUpdate) => void
  ): Promise<{ dataUrl: string; mimeType: string }> => {
    const { width, height } = renderResolutionMap[request.resolution];
    const previewFrame = document.querySelector('iframe[title="motion-preview"]');
    const sourceWidth = previewFrame instanceof HTMLIFrameElement
      ? Math.max(1, Math.round(previewFrame.clientWidth))
      : width;
    const sourceHeight = previewFrame instanceof HTMLIFrameElement
      ? Math.max(1, Math.round(previewFrame.clientHeight))
      : height;
    const iframe = document.createElement('iframe');
    // html2canvas may require same-origin document access while cloning; allow-same-origin is enabled
    // only for this temporary off-screen render iframe.
    iframe.setAttribute('sandbox', 'allow-scripts allow-same-origin');
    iframe.style.position = 'fixed';
    iframe.style.left = '-10000px';
    iframe.style.top = '0';
    iframe.style.width = `${width}px`;
    iframe.style.height = `${height}px`;
    iframe.style.opacity = '0';
    iframe.style.pointerEvents = 'none';
    iframe.srcdoc = buildMotionRenderSrcDoc(html, width, height);

    return new Promise((resolve, reject) => {
      const channel = 'motion-duo-render';
      const requestId = `render-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      let hasPostedRequest = false;

      const cleanup = () => {
        window.removeEventListener('message', onMessage);
        clearTimeout(timeoutId);
        iframe.remove();
      };

      const onMessage = (event: MessageEvent) => {
        const message = event.data;
        if (event.source !== iframe.contentWindow) return;
        if (!message || message.channel !== channel) return;

        if (message.id === requestId && message.progress) {
          onProgress?.({
            percent: Number(message.progress.percent) || 0,
            status: String(message.progress.status || 'Rendering...'),
          });
          return;
        }

        if (message.ready && !hasPostedRequest) {
          hasPostedRequest = true;
          iframe.contentWindow?.postMessage({
            channel,
            id: requestId,
            command: request.format === 'png' ? 'render-png' : 'render-video',
            payload: {
              includeBackground: request.includeBackground,
              backgroundColor: request.backgroundColor,
              durationSeconds: request.durationSeconds,
              frameRate: request.frameRate,
              width,
              height,
              sourceWidth,
              sourceHeight,
            },
          }, '*');
          return;
        }

        if (message.id !== requestId) return;

        if (message.ok) {
          cleanup();
          resolve(message.payload as { dataUrl: string; mimeType: string });
          return;
        }

        cleanup();
        reject(new Error(message.error || 'Render failed.'));
      };

      const timeoutId = setTimeout(() => {
        cleanup();
        reject(new Error('Render timed out. Try a shorter duration or lower resolution.'));
      }, 90_000);

      window.addEventListener('message', onMessage);
      document.body.appendChild(iframe);
    });
  }, []);

  const handleRender = useCallback(async (request: RenderRequest) => {
    if (!motionHtml) {
      toast({
        title: "No Animation Found",
        description: "Generate an animation first, then render it.",
        variant: "destructive",
      });
      return;
    }

    const effectiveRequest =
      request.format === 'mp4'
        ? { ...request, includeBackground: true }
        : request;

    if (request.format === 'mp4' && !request.includeBackground) {
      toast({
        title: "Transparency Notice",
        description: "MP4 exports do not support alpha transparency, so background was enabled automatically.",
      });
    }

    setRenderProgress(1);
    setRenderStatus('Preparing renderer...');
    setIsRendering(true);
    try {
      await wait(80);
      const output = await renderMotionAsset(effectiveRequest, motionHtml, progressUpdate => {
        setRenderProgress(Math.max(1, Math.min(100, Math.round(progressUpdate.percent))));
        setRenderStatus(progressUpdate.status || 'Rendering...');
      });
      const isVideo = effectiveRequest.format === 'mp4';
      const producedWebm = isVideo && output.mimeType.includes('webm');
      const extension = isVideo ? (producedWebm ? 'webm' : 'mp4') : 'png';
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const filename = `motion-duo-render-${timestamp}.${extension}`;

      setRenderProgress(100);
      setRenderStatus('Download started.');
      downloadDataUrl(output.dataUrl, filename);
      setIsRenderDialogOpen(false);

      if (producedWebm) {
        toast({
          title: "Render Complete",
          description: "MP4 codec was unavailable, so the export was saved as WebM.",
        });
      } else {
        toast({
          title: "Render Complete",
          description: `Your ${extension.toUpperCase()} export is downloading.`,
        });
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : "Render failed unexpectedly.";
      setRenderStatus('Render failed.');
      toast({
        title: "Render Failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsRendering(false);
    }
  }, [downloadDataUrl, motionHtml, renderMotionAsset, toast]);

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
        onReplay={() => {
          if (motionHtml) setReplayNonce(n => n + 1);
        }}
        onRender={() => setIsRenderDialogOpen(true)}
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
              mediaAssets={mediaAssets}
              attachedMediaIds={attachedMediaIds}
              onAttachedMediaIdsChange={setAttachedMediaIds}
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
            replayNonce={replayNonce}
          />
          <BottomControls
            appMode={appMode}
            onUndo={undo}
            onRedo={redo}
          />

          <div className="absolute top-4 right-4 flex flex-col gap-2 md:hidden">

            {appMode === 'motion' && motionHtml && (
              <Button
                size="icon"
                variant="secondary"
                className="rounded-full shadow-lg h-10 w-10 bg-[#232326] border border-white/10 text-white"
                onClick={() => setReplayNonce(n => n + 1)}
              >
                <RefreshCw className="w-5 h-5" />
              </Button>
            )}
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

            {appMode === 'sketch' && (
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
            )}

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
            className="w-[320px] h-full flex flex-col"
          />
        </div>
      </div>

      <MediaModal
        isOpen={isMediaModalOpen}
        onClose={() => setIsMediaModalOpen(false)}
        onConfirm={handleImportConfirm}
      />

      <RenderDialog
        isOpen={isRenderDialogOpen}
        onOpenChange={open => {
          if (isRendering && !open) return;
          setIsRenderDialogOpen(open);
        }}
        onRender={handleRender}
        isRendering={isRendering}
        defaultBackgroundColor={canvasColor}
        renderProgress={renderProgress}
        renderStatus={renderStatus}
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
