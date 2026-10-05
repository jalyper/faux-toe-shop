/**
 * useCanvasFilters - Simplified hook for applying WASM filters to a canvas
 *
 * This hook provides an easy way to integrate WASM-accelerated filters
 * into the existing Fabric.js canvas without requiring full engine migration.
 */

import { useCallback, useRef, useEffect, useState } from 'react';
import { WasmFilterEngine } from '../filters/WasmFilterEngine';
import type { FilterOptions } from '../types';

interface UseCanvasFiltersReturn {
  /** Apply filters to an ImageData object */
  applyFilters: (imageData: ImageData, filters: FilterOptions) => Promise<ImageData>;

  /** Apply filters to a canvas element directly */
  applyFiltersToCanvas: (
    canvas: HTMLCanvasElement,
    filters: FilterOptions,
    region?: { x: number; y: number; width: number; height: number }
  ) => Promise<void>;

  /** Check if WASM is being used (vs JS fallback) */
  isWasmActive: boolean;

  /** Check if the engine is ready */
  isReady: boolean;

  /** Performance stats from last operation */
  lastPerformance: {
    durationMs: number;
    pixelsProcessed: number;
    usingWasm: boolean;
  } | null;
}

/**
 * Hook for applying high-performance WASM filters to canvas/ImageData
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { applyFilters, isReady, isWasmActive } = useCanvasFilters();
 *
 *   const handleBrightnessChange = async (value: number) => {
 *     const ctx = canvasRef.current.getContext('2d');
 *     const imageData = ctx.getImageData(0, 0, width, height);
 *
 *     const filtered = await applyFilters(imageData, { brightness: value / 100 });
 *     ctx.putImageData(filtered, 0, 0);
 *   };
 *
 *   return <div>Using WASM: {isWasmActive ? 'Yes' : 'No (JS fallback)'}</div>;
 * }
 * ```
 */
export function useCanvasFilters(): UseCanvasFiltersReturn {
  const engineRef = useRef<WasmFilterEngine | null>(null);
  const [isReady, setIsReady] = useState(false);
  const [isWasmActive, setIsWasmActive] = useState(false);
  const [lastPerformance, setLastPerformance] = useState<UseCanvasFiltersReturn['lastPerformance']>(null);

  // Initialize engine
  useEffect(() => {
    let mounted = true;

    async function init() {
      const engine = new WasmFilterEngine();
      engineRef.current = engine;

      const wasmLoaded = await engine.init();

      if (mounted) {
        setIsReady(true);
        setIsWasmActive(wasmLoaded);
        console.log(`[useCanvasFilters] Ready, using ${wasmLoaded ? 'WASM' : 'JS fallback'}`);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, []);

  // Apply filters to ImageData
  const applyFilters = useCallback(async (
    imageData: ImageData,
    filters: FilterOptions
  ): Promise<ImageData> => {
    const engine = engineRef.current;
    if (!engine) {
      console.warn('[useCanvasFilters] Engine not initialized');
      return imageData;
    }

    const startTime = performance.now();
    const result = await engine.applyFilters(imageData, filters);
    const endTime = performance.now();

    setLastPerformance({
      durationMs: endTime - startTime,
      pixelsProcessed: imageData.width * imageData.height,
      usingWasm: isWasmActive,
    });

    return result;
  }, [isWasmActive]);

  // Apply filters directly to a canvas
  const applyFiltersToCanvas = useCallback(async (
    canvas: HTMLCanvasElement,
    filters: FilterOptions,
    region?: { x: number; y: number; width: number; height: number }
  ): Promise<void> => {
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      console.warn('[useCanvasFilters] Cannot get 2D context');
      return;
    }

    const { x = 0, y = 0, width = canvas.width, height = canvas.height } = region || {};

    // Get image data
    const imageData = ctx.getImageData(x, y, width, height);

    // Apply filters
    const filtered = await applyFilters(imageData, filters);

    // Put back
    ctx.putImageData(filtered, x, y);
  }, [applyFilters]);

  return {
    applyFilters,
    applyFiltersToCanvas,
    isWasmActive,
    isReady,
    lastPerformance,
  };
}

/**
 * Filter presets for common adjustments
 */
export const filterPresets = {
  none: {} as FilterOptions,

  vintage: {
    sepia: true,
    contrast: -0.1,
    brightness: 0.05,
  } as FilterOptions,

  blackAndWhite: {
    grayscale: true,
    contrast: 0.2,
  } as FilterOptions,

  vibrant: {
    saturation: 0.3,
    contrast: 0.1,
  } as FilterOptions,

  muted: {
    saturation: -0.4,
    brightness: 0.05,
  } as FilterOptions,

  highContrast: {
    contrast: 0.4,
  } as FilterOptions,

  negative: {
    invert: true,
  } as FilterOptions,
};
