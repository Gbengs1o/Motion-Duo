"use client";

import React, { useRef, useEffect, useState, useCallback } from 'react';
import { AppMode } from '@/app/lib/motion-duo-types';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

interface CanvasWorkspaceProps {
  appMode: AppMode;
  isLoading: boolean;
  motionHtml: string | null;
  onUndo: () => void;
  onRedo: () => void;
}

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  appMode,
  isLoading,
  motionHtml,
  onUndo,
  onRedo,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const contextRef = useRef<CanvasRenderingContext2D | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Transform state for pan/zoom
  const [transform, setTransform] = useState({ x: 0, y: 0, scale: 1 });
  const [lastTouchPos, setLastTouchPos] = useState({ x: 0, y: 0 });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    // Responsive canvas sizing
    const resize = () => {
      const { width, height } = canvas.getBoundingClientRect();
      canvas.width = width * window.devicePixelRatio;
      canvas.height = height * window.devicePixelRatio;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
        ctx.lineCap = 'round';
        ctx.strokeStyle = '#806CE0';
        ctx.lineWidth = 3;
        contextRef.current = ctx;
      }
    };

    window.addEventListener('resize', resize);
    resize();
    return () => window.removeEventListener('resize', resize);
  }, []);

  const getPointerPos = (e: React.PointerEvent | PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left - transform.x) / transform.scale,
      y: (e.clientY - rect.top - transform.y) / transform.scale,
    };
  };

  const startDrawing = (e: React.PointerEvent) => {
    if (appMode !== 'sketch' || e.pointerType === 'mouse' && e.button !== 0) return;
    const { x, y } = getPointerPos(e);
    contextRef.current?.beginPath();
    contextRef.current?.moveTo(x, y);
    setIsDrawing(true);
  };

  const draw = (e: React.PointerEvent) => {
    if (!isDrawing || appMode !== 'sketch') return;
    const { x, y } = getPointerPos(e);
    contextRef.current?.lineTo(x, y);
    contextRef.current?.stroke();
  };

  const endDrawing = () => {
    if (!isDrawing) return;
    contextRef.current?.closePath();
    setIsDrawing(false);
  };

  // Gesture Handling (Simplified Placeholder Logic)
  const handleTouch = useCallback((e: React.TouchEvent) => {
    if (e.touches.length === 2) {
      // Pinch/Pan logic would go here
      // For now we just track to prevent scroll
      e.preventDefault();
    }
  }, []);

  return (
    <div 
      ref={containerRef}
      className="relative w-full h-full bg-[#121214] overflow-hidden flex items-center justify-center cursor-crosshair canvas-container"
      onTouchMove={handleTouch}
    >
      <canvas
        ref={canvasRef}
        onPointerDown={startDrawing}
        onPointerMove={draw}
        onPointerUp={endDrawing}
        onPointerLeave={endDrawing}
        className={cn(
          "w-full h-full transition-opacity duration-500",
          appMode === 'motion' ? "opacity-30 pointer-events-none" : "opacity-100"
        )}
        style={{
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.scale})`,
          touchAction: 'none'
        }}
      />

      {/* Motion Layer */}
      {appMode === 'motion' && motionHtml && !isLoading && (
        <div 
          className="absolute inset-0 flex items-center justify-center pointer-events-auto"
          dangerouslySetInnerHTML={{ __html: motionHtml }}
        />
      )}

      {/* Loading Overlay */}
      {isLoading && (
        <div className="absolute inset-0 z-50 bg-background/60 backdrop-blur-md flex flex-col items-center justify-center gap-4 animate-in fade-in duration-300">
          <Loader2 className="w-12 h-12 text-primary animate-spin" />
          <p className="text-primary font-medium tracking-widest uppercase text-sm">Synthesizing Motion...</p>
        </div>
      )}

      {/* Hints */}
      <div className="absolute top-4 left-4 text-[10px] text-muted-foreground uppercase tracking-widest pointer-events-none">
        {appMode === 'sketch' ? 'Drawing Active' : 'Motion Preview'}
      </div>
    </div>
  );
};