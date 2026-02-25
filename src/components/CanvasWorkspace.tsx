"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AppMode, VectorElement, Point, VectorElementType } from '@/app/lib/motion-duo-types';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface CanvasWorkspaceProps {
  appMode: AppMode;
  isLoading: boolean;
  motionHtml: string | null;
  onUndo: () => void;
  onRedo: () => void;
  activeTool: string;
  activeShape: string;
  primaryColor: string;
  canvasColor: string;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  appMode,
  isLoading,
  motionHtml,
  activeTool,
  activeShape,
  primaryColor,
  canvasColor
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const [elements, setElements] = useState<VectorElement[]>([]);
  const [currentElement, setCurrentElement] = useState<VectorElement | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  
  // Dragging state for transformation
  const [isDragging, setIsDragging] = useState(false);
  const [lastPos, setLastPos] = useState<Point>({ x: 0, y: 0 });

  const getPointerPos = (e: React.PointerEvent | PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const isPointInElement = (pos: Point, el: VectorElement): boolean => {
    const threshold = 12; // Click tolerance
    
    if (el.type === 'rect') {
      const x = el.x || 0;
      const y = el.y || 0;
      const w = el.width || 0;
      const h = el.height || 0;
      const left = Math.min(x, x + w);
      const right = Math.max(x, x + w);
      const top = Math.min(y, y + h);
      const bottom = Math.max(y, y + h);
      return pos.x >= left - threshold && pos.x <= right + threshold && pos.y >= top - threshold && pos.y <= bottom + threshold;
    }
    
    if (el.type === 'circle') {
      const dist = Math.sqrt(Math.pow(pos.x - (el.x || 0), 2) + Math.pow(pos.y - (el.y || 0), 2));
      return dist <= Math.abs(el.radius || 0) + threshold;
    }
    
    if (el.type === 'path' && el.points) {
      for (let i = 0; i < el.points.length - 1; i++) {
        const p1 = el.points[i];
        const p2 = el.points[i+1];
        const A = pos.x - p1.x;
        const B = pos.y - p1.y;
        const C = p2.x - p1.x;
        const D = p2.y - p1.y;
        const dot = A * C + B * D;
        const lenSq = C * C + D * D;
        let param = -1;
        if (lenSq !== 0) param = dot / lenSq;
        let xx, yy;
        if (param < 0) {
          xx = p1.x; yy = p1.y;
        } else if (param > 1) {
          xx = p2.x; yy = p2.y;
        } else {
          xx = p1.x + param * C;
          yy = p1.y + param * D;
        }
        const dist = Math.sqrt(Math.pow(pos.x - xx, 2) + Math.pow(pos.y - yy, 2));
        if (dist < threshold) return true;
      }
      return false;
    }
    
    if (el.type === 'text') {
      const fontSize = el.fontSize || 24;
      const width = (el.text?.length || 0) * (fontSize * 0.5);
      return pos.x >= (el.x || 0) && pos.x <= (el.x || 0) + width && pos.y >= (el.y || 0) - fontSize && pos.y <= (el.y || 0);
    }
    
    if (el.type === 'triangle' || el.type === 'polygon') {
      const dist = Math.sqrt(Math.pow(pos.x - (el.x || 0), 2) + Math.pow(pos.y - (el.y || 0), 2));
      const size = el.type === 'triangle' ? (el.width || 0) / 2 : (el.radius || 0);
      return dist <= Math.abs(size) + threshold;
    }

    return false;
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const allElements = currentElement ? [...elements, currentElement] : elements;

    allElements.forEach((el) => {
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
        const x = el.x || 0;
        const y = el.y || 0;
        const w = el.width || 0;
        const h = el.height || 0;
        ctx.moveTo(x, y - h / 2);
        ctx.lineTo(x - w / 2, y + h / 2);
        ctx.lineTo(x + w / 2, y + h / 2);
        ctx.closePath();
        ctx.stroke();
      } else if (el.type === 'polygon') {
        const sides = 6;
        const r = Math.abs(el.radius || 0);
        const x = el.x || 0;
        const y = el.y || 0;
        for (let i = 0; i <= sides; i++) {
          const angle = (i * 2 * Math.PI) / sides;
          const px = x + r * Math.cos(angle);
          const py = y + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      } else if (el.type === 'text' && el.text) {
        ctx.font = `600 ${el.fontSize || 24}px Inter, sans-serif`;
        ctx.fillText(el.text, el.x || 0, el.y || 0);
      }

      if (selectedElementId === el.id && appMode === 'sketch') {
        ctx.save();
        ctx.strokeStyle = '#806CE0';
        ctx.lineWidth = 2;
        ctx.setLineDash([6, 4]);
        
        let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
        if (el.type === 'path' && el.points) {
          el.points.forEach(p => {
            minX = Math.min(minX, p.x); minY = Math.min(minY, p.y);
            maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y);
          });
        } else if (el.type === 'rect') {
          minX = Math.min(el.x || 0, (el.x || 0) + (el.width || 0));
          minY = Math.min(el.y || 0, (el.y || 0) + (el.height || 0));
          maxX = Math.max(el.x || 0, (el.x || 0) + (el.width || 0));
          maxY = Math.max(el.y || 0, (el.y || 0) + (el.height || 0));
        } else if (el.type === 'circle' || el.type === 'polygon' || el.type === 'triangle') {
          const size = el.type === 'rect' ? 0 : (el.radius || el.width || 0) / (el.type === 'triangle' ? 1 : 1);
          minX = (el.x || 0) - Math.abs(size);
          minY = (el.y || 0) - Math.abs(size);
          maxX = (el.x || 0) + Math.abs(size);
          maxY = (el.y || 0) + Math.abs(size);
        } else if (el.type === 'text') {
           minX = el.x || 0; minY = (el.y || 0) - 24;
           maxX = minX + 100; maxY = el.y || 0;
        }
        
        if (minX !== Infinity) {
          ctx.strokeRect(minX - 10, minY - 10, (maxX - minX) + 20, (maxY - minY) + 20);
        }
        ctx.restore();
      }
    });
  }, [elements, currentElement, selectedElementId, appMode]);

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
      const hit = [...elements].reverse().find(el => isPointInElement(pos, el));
      if (hit) {
        setSelectedElementId(hit.id);
        setIsDragging(true);
      } else {
        setSelectedElementId(null);
      }
      return;
    }

    const id = Math.random().toString(36).substr(2, 9);
    if (activeTool === 'pen') {
      setCurrentElement({ id, type: 'path', points: [pos], color: primaryColor });
    } else if (activeTool === 'shape') {
      const type = activeShape as VectorElementType;
      setCurrentElement({ id, type, x: pos.x, y: pos.y, width: 0, height: 0, radius: 0, color: primaryColor });
    } else if (activeTool === 'eraser') {
      const hit = [...elements].reverse().find(el => isPointInElement(pos, el));
      if (hit) setElements(prev => prev.filter(el => el.id !== hit.id));
    } else if (activeTool === 'fill') {
      const hit = [...elements].reverse().find(el => isPointInElement(pos, el));
      if (hit) setElements(prev => prev.map(el => el.id === hit.id ? { ...el, color: primaryColor } : el));
    } else if (activeTool === 'text') {
      const text = prompt("Enter text:");
      if (text) setElements(prev => [...prev, { id, type: 'text', x: pos.x, y: pos.y, text, fontSize: 24, color: primaryColor }]);
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (appMode !== 'sketch') return;
    const pos = getPointerPos(e);
    const dx = pos.x - lastPos.x;
    const dy = pos.y - lastPos.y;

    if (isDragging && selectedElementId && activeTool === 'select') {
      setElements(prev => prev.map(el => {
        if (el.id === selectedElementId) {
          if (el.type === 'path' && el.points) {
            return { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
          }
          return { ...el, x: (el.x || 0) + dx, y: (el.y || 0) + dy };
        }
        return el;
      }));
    } else if (currentElement) {
      if (currentElement.type === 'path') {
        setCurrentElement({ ...currentElement, points: [...(currentElement.points || []), pos] });
      } else if (currentElement.type === 'rect') {
        setCurrentElement({ ...currentElement, width: pos.x - (currentElement.x || 0), height: pos.y - (currentElement.y || 0) });
      } else if (currentElement.type === 'circle' || currentElement.type === 'polygon') {
        const radius = Math.sqrt(Math.pow(pos.x - (currentElement.x || 0), 2) + Math.pow(pos.y - (currentElement.y || 0), 2));
        setCurrentElement({ ...currentElement, radius });
      } else if (currentElement.type === 'triangle') {
        setCurrentElement({ 
          ...currentElement, 
          width: Math.abs(pos.x - (currentElement.x || 0)) * 2, 
          height: Math.abs(pos.y - (currentElement.y || 0)) * 2 
        });
      }
    }
    setLastPos(pos);
  };

  const handlePointerUp = () => {
    if (currentElement) {
      setElements(prev => [...prev, currentElement]);
      setCurrentElement(null);
    }
    setIsDragging(false);
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

      <div className="absolute top-4 left-4 text-[10px] text-white/30 uppercase tracking-[0.2em] pointer-events-none font-bold">
        {appMode === 'sketch' ? `${activeTool.toUpperCase()} MODE` : 'MOTION PREVIEW'}
      </div>
    </div>
  );
};