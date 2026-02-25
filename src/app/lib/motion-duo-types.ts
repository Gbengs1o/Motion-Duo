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

export type VectorElementType = 'path' | 'rect' | 'circle' | 'triangle' | 'polygon' | 'text';

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
  color: string;
  text?: string;
  fontSize?: number;
  sides?: number; // For polygons
}