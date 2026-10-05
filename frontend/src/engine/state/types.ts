/**
 * Type definitions for the engine state management
 */

export interface Rect {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface LayerState {
  id: string;
  name: string;
  visible: boolean;
  opacity: number;
  locked: boolean;
  blendMode: BlendMode;
  pixels: Float32Array | null; // RGBA as 0-1 floats, null for empty layers
  bounds: Rect; // Actual content bounds within the layer
  dirtyRegion: Rect | null; // Region that needs re-rendering
}

export type BlendMode =
  | 'normal'
  | 'multiply'
  | 'screen'
  | 'overlay'
  | 'darken'
  | 'lighten'
  | 'color-dodge'
  | 'color-burn'
  | 'hard-light'
  | 'soft-light'
  | 'difference'
  | 'exclusion';

export interface CanvasState {
  width: number;
  height: number;
  layers: LayerState[];
  activeLayerId: string;
  backgroundColor: string;
}

export interface RegionDiff {
  bounds: Rect;
  oldPixels: Float32Array;
  newPixels: Float32Array;
}

export interface HistoryEntry {
  id: string;
  timestamp: number;
  description: string;
  layerDiffs: Map<string, RegionDiff[]>;
}

export interface FilterParams {
  brightness?: number; // -1.0 to 1.0
  contrast?: number; // -1.0 to 1.0
  saturation?: number; // -1.0 to 1.0
  blur?: number; // 0 to 100
  grayscale?: boolean;
  sepia?: boolean;
  invert?: boolean;
}
