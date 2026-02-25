"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { AppMode, VectorElement, Point, VectorElementType, BoundingBox, Layer } from '@/app/lib/motion-duo-types';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface CanvasWorkspaceProps {
  appMode: AppMode;
  isLoading: boolean;
  motionHtml: string | null;
  activeTool: string;
  activeShape: string;
  primaryColor: string;
  canvasColor: string;
  elements: VectorElement[];
  setElements: React.Dispatch<React.SetStateAction<VectorElement[]>>;
  layers: Layer[];
  activeLayerId: string;
}

type TransformType = 'move' | 'resize' | 'rotate' | 'none' | 'edit-point';
type HandleId = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se' | 'rotate';

const HANDLE_SIZE = 10;
const ROTATE_HANDLE_OFFSET = 35;

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  appMode,
  isLoading,
  motionHtml,
  activeTool,
  activeShape,
  primaryColor,
  canvasColor,
  elements,
  setElements,
  layers,
  activeLayerId
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [currentElement, setCurrentElement] = useState<VectorElement | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  const [transformType, setTransformType] = useState<TransformType>('none');
  const [activeHandle, setActiveHandle] = useState<HandleId | null>(null);
  const [lastPos, setLastPos] = useState<Point>({ x: 0, y: 0 });
  const [initialState, setInitialState] = useState<{
    element: VectorElement;
    bounds: BoundingBox;
    points?: Point[];
  } | null>(null);

  const getPointerPos = (e: React.PointerEvent | PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const getElementBounds = (el: VectorElement): BoundingBox => {
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;

    if (el.type === 'path' && el.points) {
      el.points.forEach(p => {
        minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
        maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
      });
    } else if (el.type === 'rect') {
      const x = el.x || 0; const y = el.y || 0;
      const w = el.width || 0; const h = el.height || 0;
      minX = Math.min(x, x + w); maxX = Math.max(x, x + w);
      minY = Math.min(y, y + h); maxY = Math.max(y, y + h);
    } else if (el.type === 'circle' || el.type === 'polygon' || el.type === 'triangle') {
      const r = Math.abs(el.radius || (el.width ? el.width / 2 : 0));
      minX = (el.x || 0) - r; maxX = (el.x || 0) + r;
      minY = (el.y || 0) - r; maxY = (el.y || 0) + r;
    } else if (el.type === 'text') {
      const fontSize = el.fontSize || 24;
      const width = (el.text?.length || 0) * (fontSize * 0.6);
      minX = el.x || 0; maxX = (el.x || 0) + width;
      minY = (el.y || 0) - fontSize; maxY = el.y || 0;
    }

    if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };

    return {
      minX, minY, maxX, maxY,
      width: maxX - minX,
      height: maxY - minY,
      centerX: (minX + maxX) / 2,
      centerY: (minY + maxY) / 2
    };
  };

  const selectedElement = useMemo(() => 
    elements.find(el => el.id === selectedElementId),
    [elements, selectedElementId]
  );

  const rotatePoint = (p: Point, center: Point, angle: number): Point => {
    const s = Math.sin(angle);
    const c = Math.cos(angle);
    const px = p.x - center.x;
    const py = p.y - center.y;
    return {
      x: px * c - py * s + center.x,
      y: px * s + py * c + center.y
    };
  };

  const isPointInElement = (pos: Point, el: VectorElement): boolean => {
    const layer = layers.find(l => l.id === el.layerId);
    if (!layer || !layer.visible || layer.locked) return false;

    const bounds = getElementBounds(el);
    let p = pos;
    if (el.rotation) {
      p = rotatePoint(pos, { x: bounds.centerX, y: bounds.centerY }, -el.rotation);
    }
    const threshold = 10;
    return p.x >= bounds.minX - threshold && p.x <= bounds.maxX + threshold &&
           p.y >= bounds.minY - threshold && p.y <= bounds.maxY + threshold;
  };

  const getHandleAtPos = (pos: Point, el: VectorElement): HandleId | null => {
    const bounds = getElementBounds(el);
    let p = pos;
    if (el.rotation) {
      p = rotatePoint(pos, { x: bounds.centerX, y: bounds.centerY }, -el.rotation);
    }

    const handles: Record<HandleId, Point> = {
      nw: { x: bounds.minX, y: bounds.minY },
      n:  { x: bounds.centerX, y: bounds.minY },
      ne: { x: bounds.maxX, y: bounds.minY },
      w:  { x: bounds.minX, y: bounds.centerY },
      e:  { x: bounds.maxX, y: bounds.centerY },
      sw: { x: bounds.minX, y: bounds.maxY },
      s:  { x: bounds.centerX, y: bounds.maxY },
      se: { x: bounds.maxX, y: bounds.maxY },
      rotate: { x: bounds.centerX, y: bounds.minY - ROTATE_HANDLE_OFFSET },
    };

    for (const [id, hp] of Object.entries(handles)) {
      const dist = Math.sqrt(Math.pow(p.x - hp.x, 2) + Math.pow(p.y - hp.y, 2));
      if (dist <= HANDLE_SIZE) return id as HandleId;
    }
    return null;
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    // Group elements by layer order (bottom to top)
    const sortedLayers = [...layers].reverse();
    const sortedElements = sortedLayers.flatMap(layer => 
      layer.visible ? elements.filter(el => el.layerId === layer.id) : []
    );
    
    const allElements = currentElement ? [...sortedElements, currentElement] : sortedElements;

    allElements.forEach((el) => {
      ctx.save();
      const bounds = getElementBounds(el);
      
      if (el.rotation) {
        ctx.translate(bounds.centerX, bounds.centerY);
        ctx.rotate(el.rotation);
        ctx.translate(-bounds.centerX, -bounds.centerY);
      }

      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.type === 'path' && el.points && el.points.length > 0) {
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.type === 'rect') {
        ctx.strokeRect(el.x || 0, el.y || 0, el.width || 0, el.height || 0);
      } else if (el.type === 'circle') {
        ctx.arc(el.x || 0, el.y || 0, Math.abs(el.radius || 0), 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === 'triangle') {
        const x = el.x || 0; const y = el.y || 0;
        const w = el.width || 0; const h = el.height || 0;
        ctx.moveTo(x, y - h / 2);
        ctx.lineTo(x - w / 2, y + h / 2);
        ctx.lineTo(x + w / 2, y + h / 2);
        ctx.closePath();
        ctx.stroke();
      } else if (el.type === 'polygon') {
        const sides = el.sides || 6;
        const r = Math.abs(el.radius || 0);
        const x = el.x || 0; const y = el.y || 0;
        for (let i = 0; i <= sides; i++) {
          const angle = (i * 2 * Math.PI) / sides;
          ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
        }
        ctx.stroke();
      } else if (el.type === 'text' && el.text) {
        ctx.font = `600 ${el.fontSize || 24}px Inter, sans-serif`;
        ctx.fillText(el.text, el.x || 0, el.y || 0);
      }

      if (selectedElementId === el.id && appMode === 'sketch') {
        ctx.strokeStyle = '#806CE0';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 3]);
        ctx.strokeRect(bounds.minX - 5, bounds.minY - 5, bounds.width + 10, bounds.height + 10);
        
        ctx.setLineDash([]);
        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#806CE0';
        ctx.lineWidth = 1.5;

        const handleCoords = [
          { x: bounds.minX, y: bounds.minY },
          { x: bounds.centerX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.minY },
          { x: bounds.minX, y: bounds.centerY },
          { x: bounds.maxX, y: bounds.centerY },
          { x: bounds.minX, y: bounds.maxY },
          { x: bounds.centerX, y: bounds.maxY },
          { x: bounds.maxX, y: bounds.maxY },
        ];

        handleCoords.forEach(p => {
          ctx.fillRect(p.x - HANDLE_SIZE/2, p.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
          ctx.strokeRect(p.x - HANDLE_SIZE/2, p.y - HANDLE_SIZE/2, HANDLE_SIZE, HANDLE_SIZE);
        });

        const rotP = { x: bounds.centerX, y: bounds.minY - ROTATE_HANDLE_OFFSET };
        ctx.beginPath();
        ctx.moveTo(bounds.centerX, bounds.minY - 5);
        ctx.lineTo(rotP.x, rotP.y);
        ctx.stroke();
        ctx.beginPath();
        ctx.arc(rotP.x, rotP.y, HANDLE_SIZE/2 + 2, 0, Math.PI * 2);
        ctx.fill();
        ctx.stroke();
      }
      ctx.restore();
    });
  }, [elements, currentElement, selectedElementId, appMode, layers]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const resize = () => {
      const container = containerRef.current;
      if (!container) return;
      const { width, height } = container.getBoundingClientRect();
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      render();
    };
    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, [render]);

  useEffect(() => { render(); }, [render, elements, currentElement]);

  const handlePointerDown = (e: React.PointerEvent) => {
    if (appMode !== 'sketch') return;
    const pos = getPointerPos(e);
    setLastPos(pos);
    
    if (activeTool === 'select') {
      if (selectedElement) {
        const handle = getHandleAtPos(pos, selectedElement);
        if (handle) {
          setTransformType(handle === 'rotate' ? 'rotate' : 'resize');
          setActiveHandle(handle);
          setInitialState({ 
            element: { ...selectedElement }, 
            bounds: getElementBounds(selectedElement),
            points: selectedElement.points ? [...selectedElement.points] : undefined
          });
          return;
        }
      }

      const hit = [...elements].reverse().find(el => isPointInElement(pos, el));
      if (hit) {
        setSelectedElementId(hit.id);
        setTransformType('move');
      } else {
        setSelectedElementId(null);
        setTransformType('none');
      }
      return;
    }

    const id = `el-${Math.random().toString(36).substr(2, 9)}`;
    const layer = layers.find(l => l.id === activeLayerId);
    if (layer?.locked) {
      toast({ title: "Layer Locked", description: "Unlock the active layer to draw." });
      return;
    }

    if (activeTool === 'pen') {
      setCurrentElement({ id, type: 'path', points: [pos], color: primaryColor, layerId: activeLayerId });
    } else if (activeTool === 'shape') {
      const type = activeShape as VectorElementType;
      setCurrentElement({ id, type, x: pos.x, y: pos.y, width: 0, height: 0, radius: 0, color: primaryColor, layerId: activeLayerId });
    } else if (activeTool === 'eraser') {
      const hit = [...elements].reverse().find(el => isPointInElement(pos, el));
      if (hit) setElements(prev => prev.filter(el => el.id !== hit.id));
    } else if (activeTool === 'fill') {
      const hit = [...elements].reverse().find(el => isPointInElement(pos, el));
      if (hit) setElements(prev => prev.map(el => el.id === hit.id ? { ...el, color: primaryColor } : el));
    } else if (activeTool === 'text') {
      const text = prompt("Enter text:");
      if (text) setElements(prev => [...prev, { id, type: 'text', x: pos.x, y: pos.y, text, fontSize: 24, color: primaryColor, layerId: activeLayerId }]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (appMode !== 'sketch') return;
    const pos = getPointerPos(e);
    const dx = pos.x - lastPos.x;
    const dy = pos.y - lastPos.y;

    if (transformType !== 'none' && selectedElementId && selectedElement) {
      setElements(prev => prev.map(el => {
        if (el.id !== selectedElementId) return el;

        if (transformType === 'move') {
          if (el.type === 'path' && el.points) {
            return { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
          }
          return { ...el, x: (el.x || 0) + dx, y: (el.y || 0) + dy };
        }

        if (transformType === 'resize' && activeHandle && initialState) {
          const b = initialState.bounds;
          let lp = pos;
          if (el.rotation) {
             lp = rotatePoint(pos, { x: b.centerX, y: b.centerY }, -el.rotation);
          }

          let newX = el.x || 0;
          let newY = el.y || 0;
          let newW = el.width || 0;
          let newH = el.height || 0;

          if (activeHandle.includes('e')) newW = lp.x - (el.x || 0);
          if (activeHandle.includes('w')) { newW = b.maxX - lp.x; newX = lp.x; }
          if (activeHandle.includes('s')) newH = lp.y - (el.y || 0);
          if (activeHandle.includes('n')) { newH = b.maxY - lp.y; newY = lp.y; }

          if (el.type === 'path' && initialState.points) {
             return {
               ...el,
               points: initialState.points.map(p => {
                 const relX = (p.x - b.minX) / b.width;
                 const relY = (p.y - b.minY) / b.height;
                 const currentMinX = activeHandle.includes('w') ? newX : b.minX;
                 const currentMinY = activeHandle.includes('n') ? newY : b.minY;
                 const currentMaxX = activeHandle.includes('e') ? b.minX + newW : b.maxX;
                 const currentMaxY = activeHandle.includes('s') ? b.minY + newH : b.maxY;
                 return {
                   x: currentMinX + relX * (currentMaxX - currentMinX),
                   y: currentMinY + relY * (currentMaxY - currentMinY)
                 };
               })
             };
          }

          if (el.type === 'circle') return { ...el, radius: Math.abs(newW / 2) };
          return { ...el, x: newX, y: newY, width: newW, height: newH };
        }

        if (transformType === 'rotate') {
          const b = getElementBounds(el);
          const angle = Math.atan2(pos.y - b.centerY, pos.x - b.centerX) + Math.PI/2;
          return { ...el, rotation: angle };
        }

        return el;
      }));
    } else if (currentElement) {
      if (currentElement.type === 'path') {
        setCurrentElement({ ...currentElement, points: [...(currentElement.points || []), pos] });
      } else if (currentElement.type === 'rect') {
        setCurrentElement({ ...currentElement, width: pos.x - (currentElement.x || 0), height: pos.y - (currentElement.y || 0) });
      } else if (currentElement.type === 'circle') {
        const radius = Math.sqrt(Math.pow(pos.x - (currentElement.x || 0), 2) + Math.pow(pos.y - (currentElement.y || 0), 2));
        setCurrentElement({ ...currentElement, radius });
      }
    }
    setLastPos(pos);
  };

  const handlePointerUp = () => {
    if (currentElement) {
      setElements(prev => [...prev, currentElement]);
      setCurrentElement(null);
    }
    setTransformType('none');
    setActiveHandle(null);
    setInitialState(null);
  };

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full overflow-hidden flex items-center justify-center canvas-container"
      style={{ backgroundColor: canvasColor }}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
        className={cn(
          "w-full h-full transition-opacity duration-500",
          appMode === 'motion' ? "opacity-30 pointer-events-none" : "opacity-100",
          activeTool === 'select' ? "cursor-default" : "cursor-crosshair"
        )}
        style={{ touchAction: 'none' }}
      />

      {appMode === 'motion' && motionHtml && !isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-auto"
          dangerouslySetInnerHTML={{ __html: motionHtml }}
        />
      )}

      {isLoading && (
        <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-md flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-primary font-medium tracking-widest uppercase text-sm">Synthesizing Motion...</p>
        </div>
      )}
    </div>
  );
};