"use client";

import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import { AppMode, VectorElement, Point, VectorElementType, BoundingBox, Layer } from '@/app/lib/motion-duo-types';
import { cn } from '@/lib/utils';
import { LoadingAnimation } from './LoadingAnimation';
import { useToast } from '@/hooks/use-toast';
import { Copy, Clipboard } from 'lucide-react';
import { PointEditorPanel } from './PointEditorPanel';

interface CanvasWorkspaceProps {
  appMode: AppMode;
  isLoading: boolean;
  motionHtml: string | null;
  activeTool: string;
  activeShape: string;
  eraserMode: 'object' | 'precise';
  primaryColor: string;
  canvasColor: string;
  elements: VectorElement[];
  setElements: React.Dispatch<React.SetStateAction<VectorElement[]>>;
  layers: Layer[];
  activeLayerId: string;
  onAddLayer: () => string;
  replayNonce?: number;
}

type TransformType = 'move' | 'resize' | 'rotate' | 'none';
type HandleId = 'nw' | 'n' | 'ne' | 'w' | 'e' | 'sw' | 's' | 'se' | 'rotate';

const HANDLE_SIZE = 10;
const ROTATE_HANDLE_OFFSET = 35;
const ERASER_RADIUS = 12;

// ─── Geometry Helpers ──────────────────────────────────────────────

const rotatePoint = (p: Point, center: Point, angle: number): Point => {
  const s = Math.sin(angle), c = Math.cos(angle);
  const px = p.x - center.x, py = p.y - center.y;
  return { x: px * c - py * s + center.x, y: px * s + py * c + center.y };
};

const getElementBounds = (el: VectorElement): BoundingBox => {
  let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
  if (el.type === 'path' && el.points && el.points.length > 0) {
    el.points.forEach(p => { minX = Math.min(minX, p.x); minY = Math.min(minY, p.y); maxX = Math.max(maxX, p.x); maxY = Math.max(maxY, p.y); });
  } else if (el.type === 'rect' || el.type === 'image') {
    const x = el.x || 0, y = el.y || 0, w = el.width || 0, h = el.height || 0;
    minX = Math.min(x, x + w); maxX = Math.max(x, x + w);
    minY = Math.min(y, y + h); maxY = Math.max(y, y + h);
  } else if (el.type === 'circle' || el.type === 'polygon' || el.type === 'triangle' || el.type === 'star') {
    const r = Math.abs(el.radius || (el.width ? el.width / 2 : 0));
    minX = (el.x || 0) - r; maxX = (el.x || 0) + r;
    minY = (el.y || 0) - r; maxY = (el.y || 0) + r;
  } else if (el.type === 'diamond' || el.type === 'arrow') {
    const x = el.x || 0; const y = el.y || 0;
    const w = el.width || 0; const h = el.height || 0;
    minX = Math.min(x, x + w); maxX = Math.max(x, x + w);
    minY = Math.min(y, y + h); maxY = Math.max(y, y + h);
  } else if (el.type === 'text') {
    const fontSize = el.fontSize || 24;
    const width = (el.text?.length || 0) * (fontSize * 0.6); // Approximate text width
    minX = el.x || 0; maxX = (el.x || 0) + width;
    minY = (el.y || 0) - fontSize; maxY = el.y || 0;
  }
  if (minX === Infinity) return { minX: 0, minY: 0, maxX: 0, maxY: 0, width: 0, height: 0, centerX: 0, centerY: 0 };
  return { minX, minY, maxX, maxY, width: maxX - minX, height: maxY - minY, centerX: (minX + maxX) / 2, centerY: (minY + maxY) / 2 };
};

const distToSegment = (p: Point, a: Point, b: Point): number => {
  const dx = b.x - a.x, dy = b.y - a.y;
  const lenSq = dx * dx + dy * dy;
  if (lenSq === 0) return Math.hypot(p.x - a.x, p.y - a.y);
  let t = ((p.x - a.x) * dx + (p.y - a.y) * dy) / lenSq;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(p.x - (a.x + t * dx), p.y - (a.y + t * dy));
};

// ─── Component ─────────────────────────────────────────────────────

export const CanvasWorkspace: React.FC<CanvasWorkspaceProps> = ({
  appMode, isLoading, motionHtml, activeTool, activeShape, eraserMode, primaryColor, canvasColor,
  elements, setElements, layers, activeLayerId, onAddLayer, replayNonce = 0,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const [currentElement, setCurrentElement] = useState<VectorElement | null>(null);
  const [selectedElementId, setSelectedElementId] = useState<string | null>(null);
  const [transformType, setTransformType] = useState<TransformType>('none');
  const [activeHandle, setActiveHandle] = useState<HandleId | null>(null);
  const [isDragging, setIsDragging] = useState(false);

  // Edit-point state
  const [editingPointIndex, setEditingPointIndex] = useState<number | null>(null);

  // Text input state
  const [textInput, setTextInput] = useState<{ x: number; y: number; layerId: string } | null>(null);
  const [textValue, setTextValue] = useState('');
  const textInputRef = useRef<HTMLInputElement>(null);

  // Snapshot refs for stable transforms
  const dragStart = useRef<Point>({ x: 0, y: 0 });
  const snapElement = useRef<VectorElement | null>(null);
  const snapBounds = useRef<BoundingBox | null>(null);

  // Clipboard
  const [clipboard, setClipboard] = useState<VectorElement | null>(null);

  const { toast } = useToast();

  const imageCache = useRef<Record<string, HTMLImageElement>>({});
  const [, forceRender] = useState({});

  const selectedElement = useMemo(
    () => elements.find(el => el.id === selectedElementId),
    [elements, selectedElementId],
  );


  const motionSrcDoc = useMemo(() => {
    if (!motionHtml) return '';
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
      #motion-root {
        width: 100%;
        height: 100%;
        overflow: hidden;
      }
    </style>
  </head>
  <body>
    <div id="motion-root">${motionHtml}</div>
  </body>
</html>`;
  }, [motionHtml]);

  const motionPreviewDoc = motionSrcDoc || motionHtml || '';

  // Safely auto-focus the text input
  useEffect(() => {
    if (textInput && textInputRef.current) {
      textInputRef.current.focus();
      const tid = setTimeout(() => textInputRef.current?.focus(), 10);
      return () => clearTimeout(tid);
    }
  }, [textInput]);

  // ─── Live Color Syncing for Selected Element ───────────────────
  // Watches the primaryColor. If it changes while an object is selected, apply it.
  const prevColorRef = useRef(primaryColor);
  useEffect(() => {
    if (primaryColor !== prevColorRef.current) {
      if (selectedElementId && activeTool === 'select') {
        setElements(prev => prev.map(el =>
          el.id === selectedElementId
            // Also update fillColor if the shape already had one
            ? { ...el, color: primaryColor, fillColor: el.fillColor ? primaryColor : el.fillColor }
            : el
        ));
      }
      prevColorRef.current = primaryColor;
    }
  }, [primaryColor, selectedElementId, activeTool, setElements]);

  // ─── Hit Testing ───────────────────────────────────────────────

  const getPointerPos = (e: React.PointerEvent | PointerEvent): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  };

  const isPointInElement = useCallback((pos: Point, el: VectorElement): boolean => {
    const layer = layers.find(l => l.id === el.layerId);
    if (!layer || !layer.visible || layer.locked) return false;
    const bounds = getElementBounds(el);
    let p = pos;
    if (el.rotation) p = rotatePoint(pos, { x: bounds.centerX, y: bounds.centerY }, -el.rotation);
    const threshold = 10;
    return p.x >= bounds.minX - threshold && p.x <= bounds.maxX + threshold &&
      p.y >= bounds.minY - threshold && p.y <= bounds.maxY + threshold;
  }, [layers]);

  const getHandleAtPos = useCallback((pos: Point, el: VectorElement): HandleId | null => {
    const bounds = getElementBounds(el);
    let p = pos;
    if (el.rotation) p = rotatePoint(pos, { x: bounds.centerX, y: bounds.centerY }, -el.rotation);
    const handles: [HandleId, Point][] = [
      ['nw', { x: bounds.minX, y: bounds.minY }], ['n', { x: bounds.centerX, y: bounds.minY }],
      ['ne', { x: bounds.maxX, y: bounds.minY }], ['w', { x: bounds.minX, y: bounds.centerY }],
      ['e', { x: bounds.maxX, y: bounds.centerY }], ['sw', { x: bounds.minX, y: bounds.maxY }],
      ['s', { x: bounds.centerX, y: bounds.maxY }], ['se', { x: bounds.maxX, y: bounds.maxY }],
      ['rotate', { x: bounds.centerX, y: bounds.minY - ROTATE_HANDLE_OFFSET }],
    ];
    for (const [id, hp] of handles) {
      if (Math.hypot(p.x - hp.x, p.y - hp.y) <= HANDLE_SIZE + 2) return id;
    }
    return null;
  }, []);

  // ─── Copy / Paste ──────────────────────────────────────────────

  const handleCopy = useCallback(() => {
    if (!selectedElement) return;
    setClipboard({ ...selectedElement });
    toast({ title: 'Copied', description: 'Element copied to clipboard.' });
  }, [selectedElement, toast]);

  const handlePaste = useCallback(() => {
    if (!clipboard) return;
    const id = `el-${Math.random().toString(36).substr(2, 9)}`;
    const offset = 20;
    let pasted: VectorElement;
    if (clipboard.type === 'path' && clipboard.points) {
      pasted = { ...clipboard, id, points: clipboard.points.map(p => ({ x: p.x + offset, y: p.y + offset })), layerId: activeLayerId === 'l1' ? onAddLayer() : activeLayerId };
    } else {
      pasted = { ...clipboard, id, x: (clipboard.x || 0) + offset, y: (clipboard.y || 0) + offset, layerId: activeLayerId === 'l1' ? onAddLayer() : activeLayerId };
    }
    setElements(prev => [...prev, pasted]);
    setSelectedElementId(id);
    toast({ title: 'Pasted', description: 'Element pasted.' });
  }, [clipboard, activeLayerId, onAddLayer, setElements, toast]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (document.activeElement?.tagName === 'INPUT') return;

      if ((e.ctrlKey || e.metaKey) && e.key === 'c') { e.preventDefault(); handleCopy(); }
      if ((e.ctrlKey || e.metaKey) && e.key === 'v') { e.preventDefault(); handlePaste(); }
      if (e.key === 'Delete' || e.key === 'Backspace') {
        if (selectedElementId && activeTool === 'select') {
          setElements(prev => prev.filter(el => el.id !== selectedElementId));
          setSelectedElementId(null);
        }
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [handleCopy, handlePaste, selectedElementId, setElements, activeTool]);

  // ─── Precise Eraser ──────────────────────────────────────────

  const preciseErase = useCallback((pos: Point) => {
    setElements(prev => {
      const next: VectorElement[] = [];
      for (const el of prev) {
        if (el.type !== 'path' || !el.points || el.points.length < 2) {
          if (isPointInElement(pos, el)) continue;
          next.push(el);
          continue;
        }

        let segments: Point[][] = [[]];
        for (let i = 0; i < el.points.length; i++) {
          const pt = el.points[i];
          const nextPt = el.points[i + 1];

          if (nextPt) {
            const d = distToSegment(pos, pt, nextPt);
            if (d < ERASER_RADIUS) {
              if (segments[segments.length - 1].length > 0) {
                segments[segments.length - 1].push(pt);
              }
              segments.push([]);
              continue;
            }
          }
          segments[segments.length - 1].push(pt);
        }

        for (const seg of segments) {
          if (seg.length >= 2) {
            next.push({
              ...el,
              id: `el-${Math.random().toString(36).substr(2, 9)}`,
              points: seg,
            });
          }
        }
      }
      return next;
    });
  }, [isPointInElement, setElements]);

  // ─── Rendering ─────────────────────────────────────────────────

  const render = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.scale(window.devicePixelRatio, window.devicePixelRatio);

    const sortedLayers = [...layers].reverse();
    const sortedElements = sortedLayers.flatMap(layer =>
      layer.visible ? elements.filter(el => el.layerId === layer.id) : [],
    );
    const allElements = currentElement ? [...sortedElements, currentElement] : sortedElements;

    allElements.forEach(el => {
      ctx.save();
      const bounds = getElementBounds(el);

      if (el.rotation) {
        ctx.translate(bounds.centerX, bounds.centerY);
        ctx.rotate(el.rotation);
        ctx.translate(-bounds.centerX, -bounds.centerY);
      }

      ctx.beginPath();
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.fillColor || 'transparent';
      ctx.lineWidth = el.lineWidth || 3;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.type === 'path' && el.points && el.points.length > 0) {
        ctx.moveTo(el.points[0].x, el.points[0].y);
        for (let i = 1; i < el.points.length; i++) ctx.lineTo(el.points[i].x, el.points[i].y);
        ctx.stroke();
        if (el.fillColor) ctx.fill();
      } else if (el.type === 'rect') {
        if (el.fillColor) ctx.fillRect(el.x || 0, el.y || 0, el.width || 0, el.height || 0);
        ctx.strokeRect(el.x || 0, el.y || 0, el.width || 0, el.height || 0);
      } else if (el.type === 'circle') {
        ctx.arc(el.x || 0, el.y || 0, Math.abs(el.radius || 0), 0, Math.PI * 2);
        if (el.fillColor) ctx.fill();
        ctx.stroke();
      } else if (el.type === 'triangle') {
        const x = el.x || 0, y = el.y || 0, w = el.width || 0, h = el.height || 0;
        ctx.moveTo(x, y - h / 2); ctx.lineTo(x - w / 2, y + h / 2); ctx.lineTo(x + w / 2, y + h / 2);
        ctx.closePath();
        if (el.fillColor) ctx.fill();
        ctx.stroke();
      } else if (el.type === 'polygon') {
        const sides = el.sides || 6, r = Math.abs(el.radius || 0), x = el.x || 0, y = el.y || 0;
        for (let i = 0; i <= sides; i++) {
          const angle = (i * 2 * Math.PI) / sides;
          ctx.lineTo(x + r * Math.cos(angle), y + r * Math.sin(angle));
        }
        if (el.fillColor) ctx.fill();
        ctx.stroke();
      } else if (el.type === 'star') {
        const r = Math.abs(el.radius || 0), x = el.x || 0, y = el.y || 0;
        const spikes = el.sides || 5, outerRadius = r, innerRadius = r / 2.5;
        let rot = Math.PI / 2 * 3, cx = x, cy = y, step = Math.PI / spikes;
        ctx.moveTo(x, y - outerRadius);
        for (let i = 0; i < spikes; i++) {
          cx = x + Math.cos(rot) * outerRadius; cy = y + Math.sin(rot) * outerRadius;
          ctx.lineTo(cx, cy); rot += step;
          cx = x + Math.cos(rot) * innerRadius; cy = y + Math.sin(rot) * innerRadius;
          ctx.lineTo(cx, cy); rot += step;
        }
        ctx.lineTo(x, y - outerRadius); ctx.closePath();
        if (el.fillColor) ctx.fill();
        ctx.stroke();
      } else if (el.type === 'diamond') {
        const x = el.x || 0, y = el.y || 0, w = el.width || 0, h = el.height || 0;
        ctx.moveTo(x + w / 2, y); ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w / 2, y + h); ctx.lineTo(x, y + h / 2);
        ctx.closePath();
        if (el.fillColor) ctx.fill();
        ctx.stroke();
      } else if (el.type === 'arrow') {
        const x = el.x || 0, y = el.y || 0, w = el.width || 0, h = el.height || 0;
        const headH = h * 0.4, bodyH = h * 0.4;
        ctx.moveTo(x, y + (h - bodyH) / 2);
        ctx.lineTo(x + w * 0.6, y + (h - bodyH) / 2);
        ctx.lineTo(x + w * 0.6, y);
        ctx.lineTo(x + w, y + h / 2);
        ctx.lineTo(x + w * 0.6, y + h);
        ctx.lineTo(x + w * 0.6, y + (h + bodyH) / 2);
        ctx.lineTo(x, y + (h + bodyH) / 2);
        ctx.closePath();
        if (el.fillColor) ctx.fill();
        ctx.stroke();
      } else if (el.type === 'text' && el.text) {
        ctx.font = `600 ${el.fontSize || 24}px Inter, sans-serif`;
        ctx.fillStyle = el.color;
        // The text scale transform naturally deforms visually here since fontSize controls proportion
        ctx.fillText(el.text, el.x || 0, el.y || 0);
      } else if (el.type === 'image' && el.imageUrl) {
        let img = imageCache.current[el.imageUrl];
        if (!img) {
          img = new Image();
          img.src = el.imageUrl;
          img.onload = () => {
            // Force a re-render when image is fully loaded
            forceRender({});
          };
          imageCache.current[el.imageUrl] = img;
        } else if (img.complete) {
          ctx.drawImage(img, el.x || 0, el.y || 0, el.width || 0, el.height || 0);
        }
      }

      // ── Selection UI ────────────────────────────────────────
      if (selectedElementId === el.id && appMode === 'sketch') {
        ctx.strokeStyle = '#806CE0';
        ctx.lineWidth = 1.5;
        ctx.setLineDash([6, 4]);
        const pad = 6;
        ctx.strokeRect(bounds.minX - pad, bounds.minY - pad, bounds.width + pad * 2, bounds.height + pad * 2);
        ctx.setLineDash([]);

        ctx.fillStyle = '#FFFFFF';
        ctx.strokeStyle = '#806CE0';
        ctx.lineWidth = 2;

        const handlePositions: Point[] = [
          { x: bounds.minX, y: bounds.minY }, { x: bounds.centerX, y: bounds.minY },
          { x: bounds.maxX, y: bounds.minY }, { x: bounds.minX, y: bounds.centerY },
          { x: bounds.maxX, y: bounds.centerY }, { x: bounds.minX, y: bounds.maxY },
          { x: bounds.centerX, y: bounds.maxY }, { x: bounds.maxX, y: bounds.maxY },
        ];

        handlePositions.forEach(p => {
          ctx.beginPath();
          ctx.roundRect(p.x - HANDLE_SIZE / 2, p.y - HANDLE_SIZE / 2, HANDLE_SIZE, HANDLE_SIZE, 2);
          ctx.fill();
          ctx.stroke();
        });

        // Rotate handle
        const rotP = { x: bounds.centerX, y: bounds.minY - ROTATE_HANDLE_OFFSET };
        ctx.beginPath();
        ctx.setLineDash([3, 3]);
        ctx.moveTo(bounds.centerX, bounds.minY - pad);
        ctx.lineTo(rotP.x, rotP.y);
        ctx.stroke();
        ctx.setLineDash([]);
        ctx.beginPath();
        ctx.arc(rotP.x, rotP.y, HANDLE_SIZE / 2 + 2, 0, Math.PI * 2);
        ctx.fillStyle = '#806CE0';
        ctx.fill();
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 2;
        ctx.stroke();
      }

      if (selectedElementId === el.id && activeTool === 'vector' && el.type === 'path' && el.points) {
        ctx.setLineDash([]);
        el.points.forEach((pt, idx) => {
          ctx.beginPath();
          ctx.arc(pt.x, pt.y, 5, 0, Math.PI * 2);
          ctx.fillStyle = editingPointIndex === idx ? '#FF5C00' : '#806CE0';
          ctx.fill();
          ctx.strokeStyle = '#FFFFFF';
          ctx.lineWidth = 2;
          ctx.stroke();
        });
      }

      ctx.restore();
    });
  }, [elements, currentElement, selectedElementId, appMode, layers, activeTool, editingPointIndex]);

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

  // ─── Pointer Handlers ──────────────────────────────────────────

  const handlePointerDown = (e: React.PointerEvent) => {
    if (appMode !== 'sketch') return;
    e.preventDefault();
    const pos = getPointerPos(e);

    if (textInput && activeTool !== 'text') {
      commitText();
    }

    if (activeTool !== 'text') {
      setIsDragging(true);
    }

    if (activeTool === 'select') {
      if (selectedElement) {
        const handle = getHandleAtPos(pos, selectedElement);
        if (handle) {
          setTransformType(handle === 'rotate' ? 'rotate' : 'resize');
          setActiveHandle(handle);
          dragStart.current = pos;
          snapElement.current = { ...selectedElement, points: selectedElement.points ? [...selectedElement.points] : undefined };
          snapBounds.current = getElementBounds(selectedElement);
          return;
        }
      }
      const hit = [...elements].reverse().find(el => isPointInElement(pos, el));
      if (hit) {
        setSelectedElementId(hit.id);
        // Force the parent's color picker to match this object if desired (requires callback),
        // but for now, we leave the logic that applying a new color edits it.
        setTransformType('move');
        dragStart.current = pos;
        snapElement.current = { ...hit, points: hit.points ? [...hit.points] : undefined };
        snapBounds.current = getElementBounds(hit);
      } else {
        setSelectedElementId(null);
        setTransformType('none');
      }
      return;
    }

    if (activeTool === 'vector') {
      if (!selectedElement) {
        const hit = [...elements].reverse().find(el => isPointInElement(pos, el));
        if (hit) setSelectedElementId(hit.id);
        return;
      }
      if (selectedElement.type === 'path' && selectedElement.points) {
        const nearIdx = selectedElement.points.findIndex(pt => Math.hypot(pt.x - pos.x, pt.y - pos.y) < 10);
        if (nearIdx !== -1) {
          if (e.detail === 2 && selectedElement.points.length > 2) {
            setElements(prev => prev.map(el => {
              if (el.id !== selectedElementId || !el.points) return el;
              return { ...el, points: el.points.filter((_, i) => i !== nearIdx) };
            }));
            setEditingPointIndex(null);
            return;
          }
          setEditingPointIndex(nearIdx);
          dragStart.current = pos;
          return;
        }
        for (let i = 0; i < selectedElement.points.length - 1; i++) {
          const d = distToSegment(pos, selectedElement.points[i], selectedElement.points[i + 1]);
          if (d < 10) {
            setElements(prev => prev.map(el => {
              if (el.id !== selectedElementId || !el.points) return el;
              const newPoints = [...el.points];
              newPoints.splice(i + 1, 0, pos);
              return { ...el, points: newPoints };
            }));
            setEditingPointIndex(i + 1);
            return;
          }
        }
        setSelectedElementId(null);
        setEditingPointIndex(null);
      } else {
        const hit = [...elements].reverse().find(el => isPointInElement(pos, el));
        if (hit) setSelectedElementId(hit.id);
        else setSelectedElementId(null);
      }
      return;
    }

    if (activeTool === 'eraser') {
      if (eraserMode === 'object') {
        const hit = [...elements].reverse().find(el => isPointInElement(pos, el));
        if (hit) setElements(prev => prev.filter(el => el.id !== hit.id));
      } else {
        preciseErase(pos);
      }
      return;
    }

    if (activeTool === 'fill') {
      const hit = [...elements].reverse().find(el => isPointInElement(pos, el));
      if (hit) {
        setElements(prev => prev.map(el => el.id === hit.id ? { ...el, fillColor: primaryColor } : el));
      }
      return;
    }

    if (activeTool === 'text') {
      if (textInput && textValue.trim()) {
        commitText();
      }
      let targetLayerId = activeLayerId;
      if (targetLayerId === 'l1') targetLayerId = onAddLayer();
      setTextInput({ x: pos.x, y: pos.y, layerId: targetLayerId });
      setTextValue('');
      return;
    }

    const id = `el-${Math.random().toString(36).substr(2, 9)}`;
    let targetLayerId = activeLayerId;
    if (targetLayerId === 'l1' && (activeTool === 'pen' || activeTool === 'shape')) {
      targetLayerId = onAddLayer();
    }

    const layer = layers.find(l => l.id === targetLayerId);
    if (layer?.locked) {
      toast({ title: 'Layer Locked', description: 'Unlock the active layer to draw.' });
      return;
    }

    if (activeTool === 'pen') {
      setCurrentElement({ id, type: 'path', points: [pos], color: primaryColor, layerId: targetLayerId });
    } else if (activeTool === 'shape') {
      const type = activeShape as VectorElementType;
      setCurrentElement({ id, type, x: pos.x, y: pos.y, width: 0, height: 0, radius: 0, color: primaryColor, layerId: targetLayerId });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (appMode !== 'sketch' || !isDragging) return;
    const pos = getPointerPos(e);

    if (activeTool === 'vector' && editingPointIndex !== null && selectedElementId) {
      setElements(prev => prev.map(el => {
        if (el.id !== selectedElementId || !el.points) return el;
        const newPoints = [...el.points];
        newPoints[editingPointIndex] = pos;
        return { ...el, points: newPoints };
      }));
      return;
    }

    if (activeTool === 'eraser') {
      if (eraserMode === 'object') {
        const hit = [...elements].reverse().find(el => isPointInElement(pos, el));
        if (hit) setElements(prev => prev.filter(el => el.id !== hit.id));
      } else {
        preciseErase(pos);
      }
      return;
    }

    if (transformType !== 'none' && selectedElementId && snapElement.current && snapBounds.current) {
      const snap = snapElement.current;
      const sb = snapBounds.current;
      const start = dragStart.current;
      const totalDx = pos.x - start.x;
      const totalDy = pos.y - start.y;

      setElements(prev => prev.map(el => {
        if (el.id !== selectedElementId) return el;

        if (transformType === 'move') {
          if (snap.type === 'path' && snap.points) {
            return { ...el, points: snap.points.map(p => ({ x: p.x + totalDx, y: p.y + totalDy })) };
          }
          return { ...el, x: (snap.x || 0) + totalDx, y: (snap.y || 0) + totalDy };
        }

        if (transformType === 'resize' && activeHandle) {
          let lp = pos, ls = start;
          if (snap.rotation) {
            const center = { x: sb.centerX, y: sb.centerY };
            lp = rotatePoint(pos, center, -snap.rotation);
            ls = rotatePoint(start, center, -snap.rotation);
          }
          const ldx = lp.x - ls.x, ldy = lp.y - ls.y;
          let newMinX = sb.minX, newMinY = sb.minY, newMaxX = sb.maxX, newMaxY = sb.maxY;

          if (activeHandle.includes('e')) newMaxX = sb.maxX + ldx;
          if (activeHandle.includes('w')) newMinX = sb.minX + ldx;
          if (activeHandle.includes('s')) newMaxY = sb.maxY + ldy;
          if (activeHandle.includes('n')) newMinY = sb.minY + ldy;
          if (newMinX > newMaxX - 2) newMinX = newMaxX - 2;
          if (newMinY > newMaxY - 2) newMinY = newMaxY - 2;

          const newW = newMaxX - newMinX, newH = newMaxY - newMinY;

          // ── Text Resizing / Deforming Logic ──
          if (snap.type === 'text') {
            const scaleX = sb.width > 0 ? newW / sb.width : 1;
            const scaleY = sb.height > 0 ? newH / sb.height : 1;

            // Text naturally scales proportionally in canvas apps 
            // We use the largest scaling factor to maintain quality
            const scale = Math.max(scaleX, scaleY);
            const newFontSize = Math.max(8, (snap.fontSize || 24) * scale);

            // Ensure the baseline 'y' adjusts correctly to the new top boundary (newMinY)
            return {
              ...el,
              x: newMinX,
              y: newMinY + newFontSize,
              fontSize: newFontSize
            };
          }

          if (snap.type === 'path' && snap.points) {
            const scaleX = sb.width > 0 ? newW / sb.width : 1;
            const scaleY = sb.height > 0 ? newH / sb.height : 1;
            return { ...el, points: snap.points.map(p => ({ x: newMinX + (p.x - sb.minX) * scaleX, y: newMinY + (p.y - sb.minY) * scaleY })) };
          }
          if (snap.type === 'circle') return { ...el, x: newMinX + newW / 2, y: newMinY + newH / 2, radius: Math.max(newW, newH) / 2 };
          if (snap.type === 'triangle' || snap.type === 'polygon') return { ...el, x: newMinX + newW / 2, y: newMinY + newH / 2, radius: Math.max(newW, newH) / 2, width: newW, height: newH };
          return { ...el, x: newMinX, y: newMinY, width: newW, height: newH };
        }

        if (transformType === 'rotate') {
          const startAngle = Math.atan2(start.y - sb.centerY, start.x - sb.centerX);
          const curAngle = Math.atan2(pos.y - sb.centerY, pos.x - sb.centerX);
          return { ...el, rotation: (snap.rotation || 0) + (curAngle - startAngle) };
        }
        return el;
      }));
      return;
    }

    if (currentElement) {
      if (currentElement.type === 'path') {
        setCurrentElement({ ...currentElement, points: [...(currentElement.points || []), pos] });
      } else if (currentElement.type === 'rect' || currentElement.type === 'diamond' || currentElement.type === 'arrow') {
        setCurrentElement({ ...currentElement, width: pos.x - (currentElement.x || 0), height: pos.y - (currentElement.y || 0) });
      } else if (currentElement.type === 'circle' || currentElement.type === 'star') {
        const radius = Math.hypot(pos.x - (currentElement.x || 0), pos.y - (currentElement.y || 0));
        setCurrentElement({ ...currentElement, radius });
      }
    }
  };

  const handlePointerUp = () => {
    if (currentElement) {
      setElements(prev => [...prev, currentElement]);
      setCurrentElement(null);
    }
    setIsDragging(false);
    setTransformType('none');
    setActiveHandle(null);
    setEditingPointIndex(null);
    snapElement.current = null;
    snapBounds.current = null;
  };

  const isCommittingRef = useRef(false);
  const commitText = useCallback(() => {
    if (isCommittingRef.current) return;
    isCommittingRef.current = true;

    if (textInput && textValue.trim()) {
      const id = `el-${Math.random().toString(36).substr(2, 9)}`;
      setElements(prev => [...prev, {
        id, type: 'text',
        x: textInput.x,
        y: textInput.y + 18,
        text: textValue.trim(),
        fontSize: 24,
        color: primaryColor,
        layerId: textInput.layerId,
      }]);
    }
    setTextInput(null);
    setTextValue('');

    setTimeout(() => {
      isCommittingRef.current = false;
    }, 100);
  }, [textInput, textValue, primaryColor, setElements]);

  const getTextInputPosition = useCallback(() => {
    if (!textInput || !canvasRef.current) return { left: 0, top: 0 };
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      left: rect.left + textInput.x - 8,
      top: rect.top + textInput.y - 14,
    };
  }, [textInput]);

  const getCursor = () => {
    if (activeTool === 'select') return 'cursor-default';
    if (activeTool === 'vector') return 'cursor-crosshair';
    if (activeTool === 'eraser') return 'cursor-cell';
    if (activeTool === 'fill') return 'cursor-pointer';
    if (activeTool === 'text') return 'cursor-text';
    return 'cursor-crosshair';
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
          getCursor(),
        )}
        style={{ touchAction: 'none' }}
      />

      {textInput && (
        <input
          key={`${textInput.x}-${textInput.y}`}
          ref={textInputRef}
          type="text"
          value={textValue}
          onChange={e => setTextValue(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter') commitText();
            if (e.key === 'Escape') { setTextInput(null); setTextValue(''); }
          }}
          onBlur={commitText}
          onPointerDown={e => e.stopPropagation()}
          onMouseDown={e => e.stopPropagation()}
          className="fixed z-40 bg-zinc-900/90 border-b-2 border-primary text-white font-semibold outline-none px-2 py-1 min-w-[120px] backdrop-blur-md rounded-t-md shadow-2xl"
          style={{
            left: getTextInputPosition().left,
            top: getTextInputPosition().top,
            fontSize: '24px',
            fontFamily: 'Inter, sans-serif',
            color: primaryColor,
            caretColor: primaryColor
          }}
          placeholder="New text..."
        />
      )}

      {appMode === 'sketch' && activeTool === 'select' && selectedElement && (
        <div className="absolute bottom-24 right-4 flex flex-col gap-2 md:hidden z-30">
          <button onClick={handleCopy}
            className="w-11 h-11 rounded-xl bg-[#2a2a2e] border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 active:scale-95 transition-all shadow-lg"
            aria-label="Copy">
            <Copy className="w-4 h-4" />
          </button>
          <button onClick={handlePaste} disabled={!clipboard}
            className={cn(
              "w-11 h-11 rounded-xl border flex items-center justify-center transition-all shadow-lg active:scale-95",
              clipboard ? "bg-[#2a2a2e] border-white/10 text-white/70 hover:text-white hover:bg-white/10" : "bg-[#1a1a1e] border-white/5 text-white/20 cursor-not-allowed",
            )}
            aria-label="Paste">
            <Clipboard className="w-4 h-4" />
          </button>
        </div>
      )}

      {appMode === 'motion' && motionHtml && !isLoading && (
        <iframe
          key={`motion-${replayNonce}-${motionPreviewDoc.length}`}
          title="motion-preview"
          className="absolute inset-0 w-full h-full border-0 bg-transparent pointer-events-auto"
          srcDoc={motionPreviewDoc}
          sandbox="allow-scripts"
        />
      )}

      {appMode === 'sketch' && activeTool === 'vector' && (
        <PointEditorPanel
          selectedElement={selectedElement || null}
          onUpdateElement={(updates) => {
            if (selectedElementId) {
              setElements(prev => prev.map(el =>
                el.id === selectedElementId ? { ...el, ...updates } : el
              ));
            }
          }}
        />
      )}

      {isLoading && <LoadingAnimation />}
    </div>
  );
};