"use client";

import React, { useState, useEffect, useRef } from 'react';
import { VectorElement } from '@/app/lib/motion-duo-types';
import { GripHorizontal, X } from 'lucide-react';
import { Slider } from '@/components/ui/slider';

interface PointEditorPanelProps {
  selectedElement: VectorElement | null;
  onUpdateElement: (updates: Partial<VectorElement>) => void;
  onClose?: () => void;
}

export const PointEditorPanel: React.FC<PointEditorPanelProps> = ({ 
  selectedElement, 
  onUpdateElement,
  onClose 
}) => {
  const [position, setPosition] = useState({ x: 100, y: 100 });
  const [isDragging, setIsDragging] = useState(false);
  const dragStartPos = useRef({ x: 0, y: 0 });
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleMove = (e: MouseEvent | TouchEvent) => {
      if (!isDragging) return;
      
      let clientX, clientY;
      if (e instanceof TouchEvent || 'touches' in e) {
        clientX = (e as TouchEvent).touches[0].clientX;
        clientY = (e as TouchEvent).touches[0].clientY;
      } else {
        clientX = (e as MouseEvent).clientX;
        clientY = (e as MouseEvent).clientY;
      }

      setPosition({
        x: clientX - dragStartPos.current.x,
        y: clientY - dragStartPos.current.y,
      });
    };

    const handleUp = () => {
      setIsDragging(false);
    };

    if (isDragging) {
      window.addEventListener('mousemove', handleMove);
      window.addEventListener('mouseup', handleUp);
      window.addEventListener('touchmove', handleMove, { passive: false });
      window.addEventListener('touchend', handleUp);
    }

    return () => {
      window.removeEventListener('mousemove', handleMove);
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('touchmove', handleMove);
      window.removeEventListener('touchend', handleUp);
    };
  }, [isDragging]);

  const handleDragStart = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    setIsDragging(true);
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }

    dragStartPos.current = {
      x: clientX - position.x,
      y: clientY - position.y,
    };
  };

  // If there's no selected element, we can show default settings, 
  // but for simplicity, let's just say "Select an element to edit" or only show when selected.
  if (!selectedElement) {
    return (
      <div 
        ref={panelRef}
        style={{ left: position.x, top: position.y }}
        className="fixed z-50 w-64 bg-[#232326] border border-white/10 shadow-2xl rounded-xl overflow-hidden flex flex-col text-white"
        onPointerDown={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        onTouchStart={(e) => e.stopPropagation()}
      >
        <div 
          className="bg-white/5 p-2 flex items-center justify-between cursor-move select-none"
          onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
        >
          <div className="flex items-center gap-2 text-white/60">
            <GripHorizontal className="w-4 h-4" />
            <span className="text-xs font-semibold uppercase tracking-wider">Point Editor</span>
          </div>
          {onClose && (
            <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md transition-colors">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
        <div className="p-4 text-center text-sm text-white/40">
          Select an element to edit its properties.
        </div>
      </div>
    );
  }

  const elementType = selectedElement.type || '';
  const isPath = elementType === 'path';
  const showPointsSlider = elementType === 'polygon' || elementType === 'star' || isPath;
  const currentLineWidth = selectedElement.lineWidth || 3;
  
  // To avoid Radix UI Slider crashing/hiding when value > max, we dynamically set max for paths.
  const pathLength = selectedElement.points?.length || 2;
  const maxSides = isPath ? Math.max(100, pathLength) : 12;
  const currentSides = isPath ? pathLength : (selectedElement.sides || (elementType === 'star' ? 5 : 6));

  return (
          <div 
            ref={panelRef}
            style={{ left: position.x, top: position.y }}
            className="fixed z-50 w-64 bg-[#232326] border border-white/10 shadow-2xl rounded-xl overflow-hidden flex flex-col text-white"
            onPointerDown={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
            onTouchStart={(e) => e.stopPropagation()}
          >      <div 
        className="bg-white/5 p-2 flex items-center justify-between cursor-move select-none"
        onMouseDown={handleDragStart}
        onTouchStart={handleDragStart}
      >
        <div className="flex items-center gap-2 text-white/60">
          <GripHorizontal className="w-4 h-4" />
          <span className="text-xs font-semibold uppercase tracking-wider">Point Editor</span>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 hover:bg-white/10 rounded-md transition-colors">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      <div className="p-4 flex flex-col gap-4">
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <label className="text-xs text-white/60 font-medium">Line Thickness</label>
            <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/80">{currentLineWidth}px</span>
          </div>
          <Slider 
            value={[currentLineWidth]} 
            min={1} 
            max={20} 
            step={1}
            onValueChange={([val]) => onUpdateElement({ lineWidth: val })} 
          />
        </div>

        {showPointsSlider && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <label className="text-xs text-white/60 font-medium">Number of Points</label>
              <span className="text-xs bg-white/10 px-2 py-0.5 rounded text-white/80">{currentSides}</span>
            </div>
            <Slider 
              value={[currentSides]} 
              min={isPath ? 2 : 3} 
              max={maxSides} 
              step={1}
              onValueChange={([val]) => {
                if (isPath && selectedElement.points) {
                  const currentPts = selectedElement.points;
                  if (currentPts.length === 0) return;
                  if (currentPts.length === 1) {
                     // Can't interpolate a single point, but ensure we don't crash
                     onUpdateElement({ points: currentPts });
                     return;
                  }

                  const newPoints = [];
                  
                  if (val <= currentPts.length) {
                    // Decimation: Reduce points evenly
                    const step = (currentPts.length - 1) / (val - 1);
                    for (let i = 0; i < val; i++) {
                      const idx = Math.min(Math.round(i * step), currentPts.length - 1);
                      newPoints.push(currentPts[idx]);
                    }
                  } else {
                    // Interpolation: Increase points by adding new ones linearly between existing points
                    
                    // 1. Calculate total length of the path
                    let totalLength = 0;
                    const segments = [];
                    for (let i = 0; i < currentPts.length - 1; i++) {
                      const p1 = currentPts[i];
                      const p2 = currentPts[i + 1];
                      const dx = p2.x - p1.x;
                      const dy = p2.y - p1.y;
                      const len = Math.hypot(dx, dy);
                      totalLength += len;
                      segments.push({ p1, p2, len, dx, dy });
                    }
                    
                    if (totalLength === 0) {
                      onUpdateElement({ points: currentPts });
                      return;
                    }

                    // 2. Step size along the total length
                    const targetStep = totalLength / (val - 1);
                    
                    newPoints.push(currentPts[0]); // Always start with the first point
                    
                    let currentDist = 0;
                    let segmentIdx = 0;
                    
                    // 3. Walk along the path and sample at targetStep intervals
                    for (let i = 1; i < val - 1; i++) {
                      const targetDist = i * targetStep;
                      
                      // Find which segment this distance falls into
                      while (segmentIdx < segments.length && currentDist + segments[segmentIdx].len < targetDist) {
                        currentDist += segments[segmentIdx].len;
                        segmentIdx++;
                      }
                      
                      if (segmentIdx >= segments.length) break; // Should only happen on precision errors at the very end
                      
                      const seg = segments[segmentIdx];
                      const remainder = targetDist - currentDist;
                      const t = seg.len > 0 ? remainder / seg.len : 0;
                      
                      newPoints.push({
                        x: seg.p1.x + seg.dx * t,
                        y: seg.p1.y + seg.dy * t
                      });
                    }
                    
                    newPoints.push(currentPts[currentPts.length - 1]); // Always end with the last point
                  }
                  
                  onUpdateElement({ points: newPoints });
                } else {
                  onUpdateElement({ sides: val });
                }
              }} 
            />
          </div>
        )}
      </div>
    </div>
  );
};