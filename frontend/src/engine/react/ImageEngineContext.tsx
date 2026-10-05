/**
 * ImageEngineContext - React context for high-performance image processing
 *
 * Provides access to:
 * - WebGL renderer for GPU-accelerated compositing
 * - WASM filter engine for fast image processing
 * - Binary state manager for efficient layer management
 * - History manager for undo/redo with binary diffs
 */

import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { WebGLRenderer } from '../renderer/WebGLRenderer';
import { WasmFilterEngine } from '../filters/WasmFilterEngine';
import { BinaryStateManager } from '../state/BinaryStateManager';
import { HistoryManager } from '../state/HistoryManager';
import type { FilterOptions, Layer } from '../types';

interface EngineState {
  isInitialized: boolean;
  isWasmReady: boolean;
  isWebGLReady: boolean;
  error: Error | null;
}

interface ImageEngineContextValue {
  // Engine instances
  renderer: WebGLRenderer | null;
  filterEngine: WasmFilterEngine | null;
  stateManager: BinaryStateManager | null;
  historyManager: HistoryManager | null;

  // State
  engineState: EngineState;

  // Actions
  applyFilters: (imageData: ImageData, filters: FilterOptions) => Promise<ImageData>;
  applyFiltersToLayer: (layerId: string, filters: FilterOptions) => Promise<void>;
  renderToCanvas: (canvas: HTMLCanvasElement) => void;

  // Layer operations
  createLayer: (id: string, name: string) => Layer;
  getLayerImageData: (layerId: string) => ImageData | null;
  setLayerImageData: (layerId: string, imageData: ImageData) => void;

  // History
  saveSnapshot: (actionName: string) => void;
  undo: () => boolean;
  redo: () => boolean;
  canUndo: boolean;
  canRedo: boolean;
}

const ImageEngineContext = createContext<ImageEngineContextValue | null>(null);

interface ImageEngineProviderProps {
  children: React.ReactNode;
  width?: number;
  height?: number;
  maxHistorySteps?: number;
}

export function ImageEngineProvider({
  children,
  width = 1200,
  height = 800,
  maxHistorySteps = 50,
}: ImageEngineProviderProps) {
  const [engineState, setEngineState] = useState<EngineState>({
    isInitialized: false,
    isWasmReady: false,
    isWebGLReady: false,
    error: null,
  });

  // Engine refs (stable across renders)
  const rendererRef = useRef<WebGLRenderer | null>(null);
  const filterEngineRef = useRef<WasmFilterEngine | null>(null);
  const stateManagerRef = useRef<BinaryStateManager | null>(null);
  const historyManagerRef = useRef<HistoryManager | null>(null);

  // History state for UI
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Initialize engines
  useEffect(() => {
    let mounted = true;

    async function initializeEngines() {
      try {
        // Initialize state manager
        const stateManager = new BinaryStateManager(width, height);
        stateManagerRef.current = stateManager;

        // Initialize history manager
        const historyManager = new HistoryManager(stateManager, maxHistorySteps);
        historyManagerRef.current = historyManager;

        // Initialize filter engine (with WASM)
        const filterEngine = new WasmFilterEngine();
        filterEngineRef.current = filterEngine;

        const wasmReady = await filterEngine.init();

        if (!mounted) return;

        setEngineState(prev => ({
          ...prev,
          isWasmReady: wasmReady,
        }));

        // WebGL renderer will be initialized when a canvas is provided
        // For now, mark as ready for non-WebGL rendering
        setEngineState(prev => ({
          ...prev,
          isInitialized: true,
          isWebGLReady: false, // Will be set when canvas is attached
        }));

        console.log('[ImageEngine] Initialized successfully', {
          wasmReady,
          width,
          height,
        });

      } catch (error) {
        console.error('[ImageEngine] Initialization failed:', error);
        if (mounted) {
          setEngineState(prev => ({
            ...prev,
            error: error as Error,
          }));
        }
      }
    }

    initializeEngines();

    return () => {
      mounted = false;
      // Cleanup
      if (rendererRef.current) {
        rendererRef.current.dispose();
        rendererRef.current = null;
      }
    };
  }, [width, height, maxHistorySteps]);

  // Apply filters to ImageData
  const applyFilters = useCallback(async (
    imageData: ImageData,
    filters: FilterOptions
  ): Promise<ImageData> => {
    const filterEngine = filterEngineRef.current;
    if (!filterEngine) {
      console.warn('[ImageEngine] Filter engine not initialized');
      return imageData;
    }

    return filterEngine.applyFilters(imageData, filters);
  }, []);

  // Apply filters to a specific layer
  const applyFiltersToLayer = useCallback(async (
    layerId: string,
    filters: FilterOptions
  ): Promise<void> => {
    const stateManager = stateManagerRef.current;
    const filterEngine = filterEngineRef.current;

    if (!stateManager || !filterEngine) {
      console.warn('[ImageEngine] Engine not initialized');
      return;
    }

    const layer = stateManager.getLayer(layerId);
    if (!layer || !layer.pixels) {
      console.warn('[ImageEngine] Layer not found:', layerId);
      return;
    }

    // Process pixels in place using Float32Array
    await filterEngine.processFloat32InPlace(layer.pixels, filters);

    // Mark the entire layer as dirty
    layer.dirtyRegion = {
      x: 0,
      y: 0,
      width: stateManager.getState().width,
      height: stateManager.getState().height,
    };
  }, []);

  // Render to canvas using WebGL
  const renderToCanvas = useCallback((canvas: HTMLCanvasElement) => {
    let renderer = rendererRef.current;

    // Initialize WebGL renderer if needed
    if (!renderer) {
      try {
        renderer = new WebGLRenderer(canvas);
        rendererRef.current = renderer;
        setEngineState(prev => ({ ...prev, isWebGLReady: true }));
      } catch (error) {
        console.warn('[ImageEngine] WebGL initialization failed, falling back to 2D:', error);
        return;
      }
    }

    const stateManager = stateManagerRef.current;
    if (!stateManager) return;

    // Get all visible layers and render them
    const state = stateManager.getState();
    const visibleLayers = state.layers.filter(l => l.visible);

    // TODO: Implement full compositing pipeline
    // For now, just render the first layer
    if (visibleLayers.length > 0) {
      const layer = visibleLayers[0];
      if (layer.pixels) {
        // Convert Float32 to ImageData for WebGL texture
        const imageData = stateManager.layerToImageData(layer.id);
        if (imageData) {
          // Create texture and render
          // renderer.renderLayer(imageData, layer.blendMode, layer.opacity);
        }
      }
    }
  }, []);

  // Layer operations
  const createLayer = useCallback((id: string, name: string): Layer => {
    const stateManager = stateManagerRef.current;
    if (!stateManager) {
      throw new Error('State manager not initialized');
    }
    return stateManager.createLayer(id, name);
  }, []);

  const getLayerImageData = useCallback((layerId: string): ImageData | null => {
    const stateManager = stateManagerRef.current;
    if (!stateManager) return null;
    return stateManager.layerToImageData(layerId);
  }, []);

  const setLayerImageData = useCallback((layerId: string, imageData: ImageData): void => {
    const stateManager = stateManagerRef.current;
    if (!stateManager) return;

    // Convert ImageData to layer
    const layer = stateManager.getLayer(layerId);
    if (layer) {
      // Update pixels from ImageData
      const pixels = layer.pixels;
      if (pixels && imageData.data.length === pixels.length) {
        for (let i = 0; i < imageData.data.length; i++) {
          pixels[i] = imageData.data[i] / 255;
        }
      }
    }
  }, []);

  // History operations
  const saveSnapshot = useCallback((actionName: string) => {
    const historyManager = historyManagerRef.current;
    if (!historyManager) return;

    historyManager.saveSnapshot(actionName);
    setCanUndo(historyManager.canUndo());
    setCanRedo(historyManager.canRedo());
  }, []);

  const undo = useCallback((): boolean => {
    const historyManager = historyManagerRef.current;
    if (!historyManager) return false;

    const result = historyManager.undo();
    setCanUndo(historyManager.canUndo());
    setCanRedo(historyManager.canRedo());
    return result;
  }, []);

  const redo = useCallback((): boolean => {
    const historyManager = historyManagerRef.current;
    if (!historyManager) return false;

    const result = historyManager.redo();
    setCanUndo(historyManager.canUndo());
    setCanRedo(historyManager.canRedo());
    return result;
  }, []);

  const value: ImageEngineContextValue = {
    renderer: rendererRef.current,
    filterEngine: filterEngineRef.current,
    stateManager: stateManagerRef.current,
    historyManager: historyManagerRef.current,
    engineState,
    applyFilters,
    applyFiltersToLayer,
    renderToCanvas,
    createLayer,
    getLayerImageData,
    setLayerImageData,
    saveSnapshot,
    undo,
    redo,
    canUndo,
    canRedo,
  };

  return (
    <ImageEngineContext.Provider value={value}>
      {children}
    </ImageEngineContext.Provider>
  );
}

/**
 * Hook to access the image engine
 */
export function useImageEngine(): ImageEngineContextValue {
  const context = useContext(ImageEngineContext);
  if (!context) {
    throw new Error('useImageEngine must be used within an ImageEngineProvider');
  }
  return context;
}

/**
 * Hook to check if the engine is ready
 */
export function useEngineReady(): boolean {
  const { engineState } = useImageEngine();
  return engineState.isInitialized;
}

/**
 * Hook to apply filters with the WASM engine
 */
export function useWasmFilters() {
  const { applyFilters, engineState } = useImageEngine();

  return {
    applyFilters,
    isReady: engineState.isWasmReady,
    isFallback: engineState.isInitialized && !engineState.isWasmReady,
  };
}
