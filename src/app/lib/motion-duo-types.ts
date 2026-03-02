export type AppMode = 'sketch' | 'motion';

export interface Layer {
  id: string;
  name: string;
  visible: boolean;
  locked: boolean;
  type: 'sketch' | 'image' | 'animation';
}

export interface MediaAsset {
  id: string;
  name: string;
  url: string;
  type: 'image' | 'svg';
}

export interface GenerationHistoryItem {
  id: string;
  timestamp: string;
  description: string;
  htmlCode: string;
}

export type VectorElementType = 'path' | 'rect' | 'circle' | 'triangle' | 'polygon' | 'text' | 'star' | 'diamond' | 'arrow' | 'image';

export interface Point {
  x: number;
  y: number;
}

export interface VectorElement {
  id: string;
  type: VectorElementType;
  points?: Point[]; // For paths
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  radius?: number;
  rotation?: number; // Rotation in radians
  anchor?: Point;
  color: string;
  fillColor?: string;
  lineWidth?: number;
  text?: string;
  imageUrl?: string; // For images
  fontSize?: number;
  sides?: number; // For polygons
  layerId: string;
}

export interface BoundingBox {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  width: number;
  height: number;
  centerX: number;
  centerY: number;
}