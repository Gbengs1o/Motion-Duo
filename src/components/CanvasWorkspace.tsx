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
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState<Point>({ x: 0, y: 0 });

  // Hit testing logic for various shapes
  const isPointInElement = (pos: Point, el: VectorElement): boolean => {
    if (el.type === 'rect') {
      const left = Math.min(el.x!, el.x! + el.width!);
      const right = Math.max(el.x!, el.x! + el.width!);
      const top = Math.min(el.y!, el.y! + el.height!);
      const bottom = Math.max(el.y!, el.y! + el.height!);
      return pos.x >= left && pos.x <= right && pos.y >= top && pos.y <= bottom;
    }
    if (el.type === 'circle') {
      const dist = Math.sqrt(Math.pow(pos.x - el.x!, 2) + Math.pow(pos.y - el.y!, 2));
      return dist <= el.radius!;
    }
    if (el.type === 'path' && el.points) {
      // Basic bounding box for paths for simplicity in hit-testing
      const xs = el.points.map(p => p.x);
      const ys = el.points.map(p => p.y);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);
      return pos.x >= minX - 10 && pos.x <= maxX + 10 && pos.y >= minY - 10 && pos.y <= maxY + 10;
    }
    if (el.type === 'text') {
       // Approximate text hit box
       return pos.x >= el.x! && pos.x <= el.x! + 100 && pos.y >= el.y! - 24 && pos.y <= el.y!;
    }
    return false;
  };

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    ctx.save();
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const allElements = currentElement ? [...elements, currentElement] : elements;

    allElements.forEach((el) => {
      ctx.beginPath();
      ctx.fillStyle = el.color;
      ctx.strokeStyle = el.color;
      ctx.lineWidth = 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.type === 'path' && el.points && el.points.length > 1) {
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.type === 'rect') {
        ctx.strokeRect(el.x!, el.y!, el.width!, el.height!);
      } else if (el.type === 'circle') {
        ctx.arc(el.x!, el.y!, Math.abs(el.radius!), 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === 'triangle') {
        ctx.moveTo(el.x!, el.y! - (el.height! / 2));
        ctx.lineTo(el.x! - (el.width! / 2), el.y! + (el.height! / 2));
        ctx.lineTo(el.x! + (el.width! / 2), el.y! + (el.height! / 2));
        ctx.closePath();
        ctx.stroke();
      } else if (el.type === 'polygon') {
        const sides = 6;
        const r = Math.abs(el.radius!);
        for (let i = 0; i <= sides; i++) {
          const angle = (i * 2 * Math.PI) / sides;
          const px = el.x! + r * Math.cos(angle);
          const py = el.y! + r * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      } else if (el.type === 'text' && el.text) {
        ctx.font = `${el.fontSize}px Inter, sans-serif`;
        ctx.fillText(el.text, el.x!, el.y!);
      }

      if (selectedElementId === el.id && appMode === 'sketch') {
        ctx.strokeStyle = '#806CE0';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        // Bounding box for selection highlight
        if (el.type === 'rect') ctx.strokeRect(el.x! - 5, el.y! - 5, el.width! + 10, el.height! + 10);
        else if (el.type === 'circle') ctx.strokeRect(el.x! - el.radius! - 5, el.y! - el.radius! - 5, (el.radius! * 2) + 10, (el.radius! * 2) + 10);
        ctx.setLineDash([]);
      }
    });

    ctx.restore();
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

  useEffect(() => {
    render();
  }, [render, elements, currentElement]);

  const getPointerPos = (e: React.PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (appMode !== 'sketch') return;
    const pos = getPointerPos(e);
    const id = Math.random().toString(36).substr(2, 9);

    if (activeTool === 'select') {
      const hit = [...elements].reverse().find(el => isPointInElement(pos, el));
      if (hit) {
        setSelectedElementId(hit.id);
        setIsDragging(true);
        setDragOffset({ x: pos.x - hit.x!, y: pos.y - hit.y! });
      } else {
        setSelectedElementId(null);
      }
    } else if (activeTool === 'pen') {
      setCurrentElement({ id, type: 'path', points: [pos], color: primaryColor });
    } else if (activeTool === 'shape') {
      const type = activeShape as VectorElementType;
      setCurrentElement({ id, type, x: pos.x, y: pos.y, width: 0, height: 0, radius: 0, color: primaryColor });
    } else if (activeTool === 'eraser') {
      setElements(prev => prev.filter(el => !isPointInElement(pos, el)));
    } else if (activeTool === 'fill') {
      setElements(prev => prev.map(el => isPointInElement(pos, el) ? { ...el, color: primaryColor } : el));
    } else if (activeTool === 'text') {
      const text = prompt("Enter text:");
      if (text) {
        setElements(prev => [...prev, { id, type: 'text', x: pos.x, y: pos.y, text, fontSize: 24, color: primaryColor }]);
      }
    }
  };

  const draw = (e: React.PointerEvent) => {
    if (appMode !== 'sketch') return;
    const pos = getPointerPos(e);

    if (isDragging && selectedElementId && activeTool === 'select') {
      setElements(prev => prev.map(el => {
        if (el.id === selectedElementId) {
          if (el.type === 'path' && el.points) {
            const dx = pos.x - el.points[0].x - dragOffset.x;
            const dy = pos.y - el.points[0].y - dragOffset.y;
            return { ...el, points: el.points.map(p => ({ x: p.x + dx, y: p.y + dy })) };
          }
          return { ...el, x: pos.x - dragOffset.x, y: pos.y - dragOffset.y };
        }
        return el;
      }));
    } else if (currentElement) {
      if (currentElement.type === 'path') {
        setCurrentElement({ ...currentElement, points: [...currentElement.points!, pos] });
      } else if (currentElement.type === 'rect') {
        setCurrentElement({ ...currentElement, width: pos.x - currentElement.x!, height: pos.y - currentElement.y! });
      } else if (currentElement.type === 'circle' || currentElement.type === 'polygon') {
        const radius = Math.sqrt(Math.pow(pos.x - currentElement.x!, 2) + Math.pow(pos.y - currentElement.y!, 2));
        setCurrentElement({ ...currentElement, radius });
      } else if (currentElement.type === 'triangle') {
        setCurrentElement({ ...currentElement, width: Math.abs(pos.x - currentElement.x!) * 2, height: Math.abs(pos.y - currentElement.y!) * 2 });
      }
    }
  };

  const endDrawing = () => {
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
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={endDrawing}
        onPointerLeave={endDrawing}
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