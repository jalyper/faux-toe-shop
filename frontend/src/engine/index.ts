/**
 * Faux-Toe-Shop Image Engine
 *
 * High-performance image processing with WebGL and WASM
 */

// Core components
export { WebGLRenderer } from './renderer/WebGLRenderer';
export { WasmFilterEngine } from './filters/WasmFilterEngine';
export { BinaryStateManager } from './state/BinaryStateManager';
export { HistoryManager } from './state/HistoryManager';

// React bindings
export {
  ImageEngineProvider,
  useImageEngine,
  useEngineReady,
  useWasmFilters,
} from './react/ImageEngineContext';

export { useCanvasFilters, filterPresets } from './react/useCanvasFilters';

// Types are available via: import type { ... } from '@/engine/types'
