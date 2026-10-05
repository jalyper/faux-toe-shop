/**
 * Main type definitions for the image engine
 */

// Re-export state types
export type {
  Rect,
  LayerState,
  BlendMode,
  CanvasState,
  RegionDiff,
  HistoryEntry,
  FilterParams,
} from './state/types';

// Filter options (normalized -1 to 1 range)
export interface FilterOptions {
  brightness?: number;  // -1.0 to 1.0
  contrast?: number;    // -1.0 to 1.0
  saturation?: number;  // -1.0 to 1.0
  blur?: number;        // 0 to 100
  grayscale?: boolean;
  sepia?: boolean;
  invert?: boolean;
}

// Alias for compatibility
export type Layer = import('./state/types').LayerState;
