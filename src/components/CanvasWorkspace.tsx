"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
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
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });

  // Render Loop
  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Scale for high DPI
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

      if (el.type === 'path' && el.points) {
        if (el.points.length < 2) return;
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) {
          ctx.lineTo(el.points[i].x, el.points[i].y);
        }
        ctx.stroke();
      } else if (el.type === 'rect') {
        ctx.strokeRect(el.x!, el.y!, el.width!, el.height!);
      } else if (el.type === 'circle') {
        ctx.arc(el.x!, el.y!, el.radius!, 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.type === 'triangle') {
        ctx.moveTo(el.x!, el.y! - el.height! / 2);
        ctx.lineTo(el.x! - el.width! / 2, el.y! + el.height! / 2);
        ctx.lineTo(el.x! + el.width! / 2, el.y! + el.height! / 2);
        ctx.closePath();
        ctx.stroke();
      } else if (el.type === 'polygon') {
        const sides = 6;
        for (let i = 0; i <= sides; i++) {
          const angle = (i * 2 * Math.PI) / sides;
          const px = el.x! + el.radius! * Math.cos(angle);
          const py = el.y! + el.radius! * Math.sin(angle);
          if (i === 0) ctx.moveTo(px, py);
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      } else if (el.type === 'text' && el.text) {
        ctx.font = `${el.fontSize}px Inter, sans-serif`;
        ctx.fillText(el.text, el.x!, el.y!);
      }

      // Draw selection highlight
      if (selectedElementId === el.id && activeTool === 'select') {
        ctx.strokeStyle = '#806CE0';
        ctx.lineWidth = 1;
        ctx.setLineDash([5, 5]);
        if (el.type === 'rect') ctx.strokeRect(el.x! - 5, el.y! - 5, el.width! + 10, el.height! + 10);
        ctx.setLineDash([]);
      }
    });

    ctx.restore();
  }, [elements, currentElement, selectedElementId, activeTool]);

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
  }, [render]);

  const getPointerPos = (e: React.PointerEvent | PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - transform.x) / transform.scale,
      y: (e.clientY - rect.top - transform.y) / transform.scale,
    };
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (appMode !== 'sketch' || (e.pointerType === 'mouse' && e.button !== 0)) return;
    const pos = getPointerPos(e);
    const id = Math.random().toString(36).substr(2, 9);

    if (activeTool === 'pen') {
      setCurrentElement({ id, type: 'path', points: [pos], color: primaryColor });
    } else if (activeTool === 'shape') {
      const type = activeShape as VectorElementType;
      setCurrentElement({ id, type, x: pos.x, y: pos.y, width: 0, height: 0, radius: 0, color: primaryColor });
    } else if (activeTool === 'eraser') {
      // Vector eraser: find and remove elements
      setElements(prev => prev.filter(el => {
        // Simple bounding box check for eraser
        if (el.x !== undefined && el.y !== undefined) {
          const dist = Math.sqrt(Math.pow(pos.x - el.x, 2) + Math.pow(pos.y - el.y, 2));
          return dist > 20;
        }
        return true;
      }));
    } else if (activeTool === 'select') {
      const hit = elements.find(el => {
        if (el.x !== undefined && el.y !== undefined) {
          const dist = Math.sqrt(Math.pow(pos.x - el.x, 2) + Math.pow(pos.y - el.y, 2));
          return dist < 30;
        }
        return false;
      });
      setSelectedElementId(hit ? hit.id : null);
    } else if (activeTool === 'fill' && selectedElementId) {
      setElements(prev => prev.map(el => el.id === selectedElementId ? { ...el, color: primaryColor } : el));
    } else if (activeTool === 'text') {
      const text = prompt("Enter text:");
      if (text) {
        setElements(prev => [...prev, { id, type: 'text', x: pos.x, y: pos.y, text, fontSize: 24, color: primaryColor }]);
      }
    }
  };

  const draw = (e: React.PointerEvent) => {
    if (!currentElement || appMode !== 'sketch') return;
    const pos = getPointerPos(e);

    if (currentElement.type === 'path') {
      setCurrentElement({
        ...currentElement,
        points: [...currentElement.points!, pos]
      });
    } else if (currentElement.type === 'rect') {
      setCurrentElement({
        ...currentElement,
        width: pos.x - currentElement.x!,
        height: pos.y - currentElement.y!
      });
    } else if (currentElement.type === 'circle' || currentElement.type === 'polygon') {
      const radius = Math.sqrt(Math.pow(pos.x - currentElement.x!, 2) + Math.pow(pos.y - currentElement.y!, 2));
      setCurrentElement({ ...currentElement, radius });
    } else if (currentElement.type === 'triangle') {
      setCurrentElement({
        ...currentElement,
        width: Math.abs(pos.x - currentElement.x!) * 2,
        height: Math.abs(pos.y - currentElement.y!) * 2
      });
    }
  };

  const endDrawing = () => {
    if (!currentElement) return;
    setElements(prev => [...prev, currentElement]);
    setCurrentElement(null);
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
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          touchAction: 'none'
        }}
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