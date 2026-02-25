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