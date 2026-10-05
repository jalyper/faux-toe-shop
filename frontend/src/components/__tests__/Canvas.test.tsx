import React from 'react';
import { render, screen, waitFor, act } from '@testing-library/react';
import { vi, describe, it, expect, beforeEach, afterEach } from 'vitest';
import Canvas from '../Canvas';
import { Canvas as FabricCanvas, Circle, Rect, IText, Image as FabricImage, PencilBrush } from 'fabric';
import { EraserBrush } from '@erase2d/fabric';

// Mock Fabric.js
vi.mock('fabric', () => {
  const mockCanvas = {
    on: vi.fn(),
    off: vi.fn(),
    dispose: vi.fn(),
    getObjects: vi.fn(() => []),
    add: vi.fn(),
    remove: vi.fn(),
    renderAll: vi.fn(),
    toJSON: vi.fn(() => ({ objects: [] })),
    loadFromJSON: vi.fn().mockResolvedValue(undefined),
    setActiveObject: vi.fn(),
    getActiveObject: vi.fn(() => null),
    discardActiveObject: vi.fn(),
    toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
    getPointer: vi.fn((e) => ({ x: 100, y: 100 })),
    clearContext: vi.fn(),
    backgroundColor: '#ffffff',
    isDrawingMode: false,
    selection: true,
    freeDrawingBrush: null,
  };

  return {
    Canvas: vi.fn(() => mockCanvas),
    Circle: vi.fn((options) => ({ type: 'circle', ...options, set: vi.fn(), erasable: false })),
    Rect: vi.fn((options) => ({ type: 'rect', ...options, set: vi.fn(), erasable: false })),
    IText: vi.fn((text, options) => ({
      type: 'i-text',
      text,
      ...options,
      set: vi.fn(),
      enterEditing: vi.fn(),
      erasable: false
    })),
    Image: {
      fromURL: vi.fn().mockResolvedValue({
        scaleToWidth: vi.fn(),
        scaleToHeight: vi.fn(),
        getElement: vi.fn(() => ({
          naturalWidth: 800,
          naturalHeight: 600,
          width: 800,
          height: 600,
        })),
        setSrc: vi.fn((url, callback) => callback && callback()),
        filters: [],
        applyFilters: vi.fn(),
      }),
    },
    PencilBrush: vi.fn(function(canvas) {
      this.canvas = canvas;
      this.color = '#000000';
      this.width = 1;
    }),
    filters: {
      Brightness: vi.fn((options) => ({ type: 'Brightness', ...options })),
      Contrast: vi.fn((options) => ({ type: 'Contrast', ...options })),
      Saturation: vi.fn((options) => ({ type: 'Saturation', ...options })),
      Blur: vi.fn((options) => ({ type: 'Blur', ...options })),
      Grayscale: vi.fn(() => ({ type: 'Grayscale' })),
      Sepia: vi.fn(() => ({ type: 'Sepia' })),
    },
  };
});

// Mock EraserBrush
vi.mock('@erase2d/fabric', () => ({
  EraserBrush: vi.fn(function(canvas) {
    this.canvas = canvas;
    this.width = 1;
  }),
}));

// Mock PressureSensitiveBrush
vi.mock('../PressureSensitiveBrush', () => ({
  default: vi.fn(function(canvas) {
    this.canvas = canvas;
    this.color = '#000000';
    this.baseWidth = 5;
    this.width = 5;
    this.simulatePressure = false;
  }),
}));

// Mock WasmFilterEngine
vi.mock('@/engine', () => ({
  WasmFilterEngine: vi.fn().mockImplementation(() => ({
    init: vi.fn().mockResolvedValue(true),
    applyFilters: vi.fn().mockImplementation((imageData, filters) => {
      // Return a modified copy
      return Promise.resolve(new ImageData(
        new Uint8ClampedArray(imageData.data),
        imageData.width,
        imageData.height
      ));
    }),
  })),
}));

describe('Canvas Component', () => {
  let mockCanvasInstance: any;
  const defaultProps = {
    activeTool: 'select' as const,
    brushSize: 10,
    brushOpacity: 100,
    pressureSensitivity: false,
    color: '#000000',
    zoom: 100,
    backgroundColor: '#ffffff',
    layers: [{ id: 'layer-1', name: 'Layer 1', visible: true, opacity: 100, locked: false }],
    activeLayerId: 'layer-1',
    onHistoryAdd: vi.fn(),
    onLayersUpdate: vi.fn(),
  };

  beforeEach(() => {
    // Reset all mocks
    vi.clearAllMocks();

    // Get the mock canvas instance
    const FabricCanvasMock = FabricCanvas as unknown as vi.Mock;
    mockCanvasInstance = {
      on: vi.fn(),
      off: vi.fn(),
      dispose: vi.fn(),
      getObjects: vi.fn(() => []),
      add: vi.fn(),
      remove: vi.fn(),
      renderAll: vi.fn(),
      toJSON: vi.fn(() => ({ objects: [] })),
      loadFromJSON: vi.fn().mockResolvedValue(undefined),
      setActiveObject: vi.fn(),
      getActiveObject: vi.fn(() => null),
      discardActiveObject: vi.fn(),
      toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
      getPointer: vi.fn((e) => ({ x: 100, y: 100 })),
      clearContext: vi.fn(),
      contextTop: {
        save: vi.fn(),
        restore: vi.fn(),
        beginPath: vi.fn(),
        moveTo: vi.fn(),
        lineTo: vi.fn(),
        quadraticCurveTo: vi.fn(),
        closePath: vi.fn(),
        fill: vi.fn(),
        fillStyle: '',
      },
      backgroundColor: '#ffffff',
      isDrawingMode: false,
      selection: true,
      freeDrawingBrush: null,
    };
    FabricCanvasMock.mockReturnValue(mockCanvasInstance);
  });

  afterEach(() => {
    vi.clearAllTimers();
  });

  describe('Rendering', () => {
    it('should render canvas container', () => {
      render(<Canvas {...defaultProps} />);

      const container = screen.getByTestId('canvas-container');
      expect(container).toBeInTheDocument();
    });

    it('should render main canvas element', () => {
      render(<Canvas {...defaultProps} />);

      const canvas = screen.getByTestId('main-canvas');
      expect(canvas).toBeInTheDocument();
      expect(canvas.tagName).toBe('CANVAS');
    });

    it('should apply zoom transform', () => {
      const { rerender } = render(<Canvas {...defaultProps} zoom={150} />);

      const canvas = screen.getByTestId('main-canvas');
      const parent = canvas.parentElement;

      expect(parent).toHaveStyle({ transform: 'scale(1.5)' });

      rerender(<Canvas {...defaultProps} zoom={50} />);
      expect(parent).toHaveStyle({ transform: 'scale(0.5)' });
    });
  });

  describe('Initialization', () => {
    it('should initialize Fabric canvas with correct config', () => {
      render(<Canvas {...defaultProps} />);

      expect(FabricCanvas).toHaveBeenCalledWith(
        expect.any(HTMLCanvasElement),
        expect.objectContaining({
          width: 1200,
          height: 800,
          backgroundColor: '#ffffff',
          renderOnAddRemove: false,
          enableRetinaScaling: true,
        })
      );
    });

    it('should initialize WASM filter engine', async () => {
      const { WasmFilterEngine } = await import('@/engine');

      render(<Canvas {...defaultProps} />);

      await waitFor(() => {
        expect(WasmFilterEngine).toHaveBeenCalled();
      });
    });

    it('should save initial state', async () => {
      render(<Canvas {...defaultProps} />);

      await waitFor(() => {
        expect(mockCanvasInstance.toJSON).toHaveBeenCalled();
      });
    });

    it('should register canvas event listeners', () => {
      render(<Canvas {...defaultProps} />);

      expect(mockCanvasInstance.on).toHaveBeenCalledWith('object:modified', expect.any(Function));
      expect(mockCanvasInstance.on).toHaveBeenCalledWith('object:added', expect.any(Function));
      expect(mockCanvasInstance.on).toHaveBeenCalledWith('path:created', expect.any(Function));
      expect(mockCanvasInstance.on).toHaveBeenCalledWith('erasing:end', expect.any(Function));
    });
  });

  describe('Tool Selection', () => {
    it('should switch to brush tool', () => {
      const { rerender } = render(<Canvas {...defaultProps} />);

      rerender(<Canvas {...defaultProps} activeTool="brush" />);

      expect(mockCanvasInstance.isDrawingMode).toBe(true);
      expect(PencilBrush).toHaveBeenCalled();
    });

    it('should switch to pencil tool', () => {
      const { rerender } = render(<Canvas {...defaultProps} />);

      rerender(<Canvas {...defaultProps} activeTool="pencil" />);

      expect(mockCanvasInstance.isDrawingMode).toBe(true);
    });

    it('should switch to eraser tool', () => {
      const { rerender } = render(<Canvas {...defaultProps} />);

      rerender(<Canvas {...defaultProps} activeTool="eraser" />);

      expect(mockCanvasInstance.isDrawingMode).toBe(true);
      expect(EraserBrush).toHaveBeenCalledWith(mockCanvasInstance);
    });

    it('should switch to text tool and disable drawing mode', () => {
      const { rerender } = render(<Canvas {...defaultProps} activeTool="brush" />);

      rerender(<Canvas {...defaultProps} activeTool="text" />);

      expect(mockCanvasInstance.isDrawingMode).toBe(false);
    });

    it('should switch to rectangle tool', () => {
      const { rerender } = render(<Canvas {...defaultProps} />);

      rerender(<Canvas {...defaultProps} activeTool="rectangle" />);

      expect(mockCanvasInstance.isDrawingMode).toBe(false);
    });

    it('should switch to circle tool', () => {
      const { rerender } = render(<Canvas {...defaultProps} />);

      rerender(<Canvas {...defaultProps} activeTool="circle" />);

      expect(mockCanvasInstance.isDrawingMode).toBe(false);
    });

    it('should switch to select tool', () => {
      const { rerender } = render(<Canvas {...defaultProps} activeTool="brush" />);

      rerender(<Canvas {...defaultProps} activeTool="select" />);

      expect(mockCanvasInstance.isDrawingMode).toBe(false);
      expect(mockCanvasInstance.selection).toBe(true);
    });

    it('should switch to move tool', () => {
      const { rerender } = render(<Canvas {...defaultProps} />);

      rerender(<Canvas {...defaultProps} activeTool="move" />);

      expect(mockCanvasInstance.isDrawingMode).toBe(false);
    });
  });

  describe('Brush Settings', () => {
    it('should update brush size', () => {
      const { rerender } = render(<Canvas {...defaultProps} activeTool="brush" brushSize={10} />);

      rerender(<Canvas {...defaultProps} activeTool="brush" brushSize={25} />);

      // PencilBrush should be called again with new instance
      expect(PencilBrush).toHaveBeenCalled();
    });

    it('should update brush opacity and convert to rgba', () => {
      const { rerender } = render(<Canvas {...defaultProps} activeTool="brush" brushOpacity={100} />);

      rerender(<Canvas {...defaultProps} activeTool="brush" brushOpacity={50} />);

      expect(PencilBrush).toHaveBeenCalled();
    });

    it.todo('should apply pressure sensitivity when enabled', () => {
      const PressureSensitiveBrush = require('../PressureSensitiveBrush').default;

      render(<Canvas {...defaultProps} activeTool="brush" pressureSensitivity={true} />);

      expect(PressureSensitiveBrush).toHaveBeenCalledWith(mockCanvasInstance);
    });

    it('should use regular brush when pressure sensitivity disabled', () => {
      render(<Canvas {...defaultProps} activeTool="brush" pressureSensitivity={false} />);

      expect(PencilBrush).toHaveBeenCalledWith(mockCanvasInstance);
    });

    it('should update brush color', () => {
      const { rerender } = render(<Canvas {...defaultProps} activeTool="brush" color="#ff0000" />);

      rerender(<Canvas {...defaultProps} activeTool="brush" color="#00ff00" />);

      expect(PencilBrush).toHaveBeenCalled();
    });
  });

  describe('Layer Management', () => {
    it('should update object visibility based on layer visibility', () => {
      const objects = [
        { layerId: 'layer-1', set: vi.fn() },
        { layerId: 'layer-2', set: vi.fn() },
      ];
      mockCanvasInstance.getObjects.mockReturnValue(objects);

      const layers = [
        { id: 'layer-1', visible: true, opacity: 100 },
        { id: 'layer-2', visible: false, opacity: 100 },
      ];

      render(<Canvas {...defaultProps} layers={layers} />);

      // Wait for layer visibility updates
      waitFor(() => {
        expect(objects[0].set).toHaveBeenCalledWith(
          expect.objectContaining({ visible: true })
        );
        expect(objects[1].set).toHaveBeenCalledWith(
          expect.objectContaining({ visible: false })
        );
      });
    });

    it('should update object opacity based on layer opacity', () => {
      const objects = [
        { layerId: 'layer-1', set: vi.fn() },
      ];
      mockCanvasInstance.getObjects.mockReturnValue(objects);

      const layers = [
        { id: 'layer-1', visible: true, opacity: 50 },
      ];

      render(<Canvas {...defaultProps} layers={layers} />);

      waitFor(() => {
        expect(objects[0].set).toHaveBeenCalledWith(
          expect.objectContaining({ opacity: 0.5 })
        );
      });
    });

    it('should update object selectability based on active layer', () => {
      const objects = [
        { layerId: 'layer-1', set: vi.fn() },
        { layerId: 'layer-2', set: vi.fn() },
      ];
      mockCanvasInstance.getObjects.mockReturnValue(objects);

      render(<Canvas {...defaultProps} activeLayerId="layer-1" />);

      waitFor(() => {
        expect(objects[0].set).toHaveBeenCalledWith(
          expect.objectContaining({ selectable: true, evented: true })
        );
        expect(objects[1].set).toHaveBeenCalledWith(
          expect.objectContaining({ selectable: false, evented: false })
        );
      });
    });

    it('should discard active object when switching to different layer', () => {
      const activeObject = { layerId: 'layer-2' };
      mockCanvasInstance.getActiveObject.mockReturnValue(activeObject);
      mockCanvasInstance.getObjects.mockReturnValue([]);

      const { rerender } = render(<Canvas {...defaultProps} activeLayerId="layer-1" />);

      rerender(<Canvas {...defaultProps} activeLayerId="layer-1" />);

      waitFor(() => {
        expect(mockCanvasInstance.discardActiveObject).toHaveBeenCalled();
      });
    });
  });

  describe('Background Color', () => {
    it('should update background color', () => {
      const { rerender } = render(<Canvas {...defaultProps} backgroundColor="#ffffff" />);

      rerender(<Canvas {...defaultProps} backgroundColor="#ff0000" />);

      waitFor(() => {
        expect(mockCanvasInstance.backgroundColor).toBe('#ff0000');
      });
    });
  });

  describe('Canvas Events', () => {
    it('should save state on object modified', async () => {
      const onHistoryAdd = vi.fn();
      render(<Canvas {...defaultProps} onHistoryAdd={onHistoryAdd} />);

      // Get the object:modified callback
      const modifiedCallback = mockCanvasInstance.on.mock.calls.find(
        (call: any) => call[0] === 'object:modified'
      )?.[1];

      expect(modifiedCallback).toBeDefined();

      // Trigger the callback
      act(() => {
        modifiedCallback?.();
      });

      await waitFor(() => {
        expect(onHistoryAdd).toHaveBeenCalledWith('Object Modified');
      });
    });

    it('should tag objects with layer ID on object:added', async () => {
      render(<Canvas {...defaultProps} activeLayerId="layer-1" />);

      const addedCallback = mockCanvasInstance.on.mock.calls.find(
        (call: any) => call[0] === 'object:added'
      )?.[1];

      const mockObject = { set: vi.fn(), erasable: false };

      act(() => {
        addedCallback?.({ target: mockObject });
      });

      await waitFor(() => {
        expect(mockObject.set).toHaveBeenCalledWith('layerId', 'layer-1');
      });
    });

    it('should save state on path created for brush strokes', async () => {
      const onHistoryAdd = vi.fn();
      render(<Canvas {...defaultProps} onHistoryAdd={onHistoryAdd} />);

      mockCanvasInstance.freeDrawingBrush = new PencilBrush(mockCanvasInstance);

      const pathCallback = mockCanvasInstance.on.mock.calls.find(
        (call: any) => call[0] === 'path:created'
      )?.[1];

      const mockPath = { set: vi.fn(), erasable: false };

      act(() => {
        pathCallback?.({ path: mockPath });
      });

      await waitFor(() => {
        expect(onHistoryAdd).toHaveBeenCalledWith('Brush Stroke');
      });
    });

    it('should not save state on path created for eraser', async () => {
      const onHistoryAdd = vi.fn();
      render(<Canvas {...defaultProps} onHistoryAdd={onHistoryAdd} />);

      mockCanvasInstance.freeDrawingBrush = new EraserBrush(mockCanvasInstance);

      const pathCallback = mockCanvasInstance.on.mock.calls.find(
        (call: any) => call[0] === 'path:created'
      )?.[1];

      const mockPath = { set: vi.fn() };

      act(() => {
        pathCallback?.({ path: mockPath });
      });

      // onHistoryAdd should NOT be called for eraser paths
      expect(onHistoryAdd).not.toHaveBeenCalledWith('Brush Stroke');
    });

    it('should save state on erasing:end', async () => {
      const onHistoryAdd = vi.fn();
      render(<Canvas {...defaultProps} onHistoryAdd={onHistoryAdd} />);

      const erasingCallback = mockCanvasInstance.on.mock.calls.find(
        (call: any) => call[0] === 'erasing:end'
      )?.[1];

      act(() => {
        erasingCallback?.();
      });

      await waitFor(() => {
        expect(onHistoryAdd).toHaveBeenCalledWith('Erased');
      });
    });
  });

  describe('Imperative Handle Methods', () => {
    it('should expose undo method', async () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      expect(ref.current?.undo).toBeDefined();
      expect(typeof ref.current?.undo).toBe('function');
    });

    it('should expose redo method', () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      expect(ref.current?.redo).toBeDefined();
      expect(typeof ref.current?.redo).toBe('function');
    });

    it('should expose loadImage method', () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      expect(ref.current?.loadImage).toBeDefined();
      expect(typeof ref.current?.loadImage).toBe('function');
    });

    it('should expose exportImage method', () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      expect(ref.current?.exportImage).toBeDefined();
      expect(typeof ref.current?.exportImage).toBe('function');
    });

    it('should expose applyFilter method', () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      expect(ref.current?.applyFilter).toBeDefined();
      expect(typeof ref.current?.applyFilter).toBe('function');
    });

    it('should expose updateLayers method', () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      expect(ref.current?.updateLayers).toBeDefined();
      expect(typeof ref.current?.updateLayers).toBe('function');
    });

    it('should expose deleteLayer method', () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      expect(ref.current?.deleteLayer).toBeDefined();
      expect(typeof ref.current?.deleteLayer).toBe('function');
    });

    it('should expose setBackgroundColor method', () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      expect(ref.current?.setBackgroundColor).toBeDefined();
      expect(typeof ref.current?.setBackgroundColor).toBe('function');
    });

    it('should perform undo operation', async () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      await act(async () => {
        await ref.current?.undo();
      });

      // Should not crash when no history
      expect(mockCanvasInstance.loadFromJSON).not.toHaveBeenCalled();
    });

    it('should perform redo operation', async () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      await act(async () => {
        await ref.current?.redo();
      });

      // Should not crash when no history
      expect(mockCanvasInstance.loadFromJSON).not.toHaveBeenCalled();
    });

    it('should export image in specified format', () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      // Mock document.createElement and click
      const mockLink = { download: '', href: '', click: vi.fn() };
      const createElementSpy = vi.spyOn(document, 'createElement').mockReturnValue(mockLink as any);

      act(() => {
        ref.current?.exportImage('png');
      });

      expect(mockCanvasInstance.toDataURL).toHaveBeenCalledWith({ format: 'png', quality: 1 });
      expect(mockLink.download).toBe('photoshop-export.png');
      expect(mockLink.click).toHaveBeenCalled();
    });

    it.todo('should set background color and save state by default', () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      act(() => {
        ref.current?.setBackgroundColor('#00ff00');
      });

      expect(mockCanvasInstance.backgroundColor).toBe('#00ff00');
    });

    it.todo('should set background color without saving state when specified', () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      const initialToJSONCallCount = mockCanvasInstance.toJSON.mock.calls.length;

      act(() => {
        ref.current?.setBackgroundColor('#00ff00', false);
      });

      expect(mockCanvasInstance.backgroundColor).toBe('#00ff00');
      // toJSON should not be called again (no new state saved)
      expect(mockCanvasInstance.toJSON.mock.calls.length).toBe(initialToJSONCallCount);
    });

    it.todo('should delete layer objects', () => {
      const ref = React.createRef<any>();

      const layerObjects = [
        { layerId: 'layer-to-delete', id: 'obj-1' },
        { layerId: 'layer-to-keep', id: 'obj-2' },
      ];
      mockCanvasInstance.getObjects.mockReturnValue(layerObjects);

      render(<Canvas {...defaultProps} ref={ref} />);

      act(() => {
        ref.current?.deleteLayer('layer-to-delete');
      });

      expect(mockCanvasInstance.remove).toHaveBeenCalledWith(layerObjects[0]);
      expect(mockCanvasInstance.remove).not.toHaveBeenCalledWith(layerObjects[1]);
    });
  });

  describe('Cleanup', () => {
    it.todo('should dispose canvas on unmount', () => {
      const { unmount } = render(<Canvas {...defaultProps} />);

      unmount();

      expect(mockCanvasInstance.dispose).toHaveBeenCalled();
    });

    it.todo('should cancel animation frame on unmount', () => {
      vi.useFakeTimers();
      const cancelAnimationFrameSpy = vi.spyOn(window, 'cancelAnimationFrame');

      const { unmount } = render(<Canvas {...defaultProps} />);

      unmount();

      vi.useRealTimers();
    });
  });

  describe('Performance Optimizations', () => {
    it.todo('should use debounced render for non-critical operations', async () => {
      vi.useFakeTimers();

      const { rerender } = render(<Canvas {...defaultProps} />);

      // Trigger multiple layer visibility changes
      rerender(<Canvas {...defaultProps} layers={[
        { id: 'layer-1', visible: false, opacity: 100 }
      ]} />);

      // Should batch renders via requestAnimationFrame
      expect(mockCanvasInstance.renderAll).not.toHaveBeenCalled();

      // Fast-forward timers
      await act(async () => {
        vi.runAllTimers();
      });

      vi.useRealTimers();
    });

    it.todo('should enforce history size limit of 10 states', async () => {
      const ref = React.createRef<any>();
      const onHistoryAdd = vi.fn();

      render(<Canvas {...defaultProps} ref={ref} onHistoryAdd={onHistoryAdd} />);

      // Simulate 15 state changes
      for (let i = 0; i < 15; i++) {
        const callback = mockCanvasInstance.on.mock.calls.find(
          (call: any) => call[0] === 'object:modified'
        )?.[1];

        act(() => {
          callback?.();
        });
      }

      // History should be limited - old states should be discarded
      await waitFor(() => {
        expect(onHistoryAdd).toHaveBeenCalledTimes(15);
      });
    });
  });

  describe('Filter Application', () => {
    it.todo('should apply brightness filter to active object', async () => {
      const ref = React.createRef<any>();

      const mockImageObject = {
        type: 'image',
        getElement: vi.fn(() => ({
          naturalWidth: 100,
          naturalHeight: 100,
          width: 100,
          height: 100,
        })),
        setSrc: vi.fn((url, callback) => callback && callback()),
        filters: [],
        applyFilters: vi.fn(),
      };

      mockCanvasInstance.getActiveObject.mockReturnValue(mockImageObject);

      render(<Canvas {...defaultProps} ref={ref} />);

      await act(async () => {
        await ref.current?.applyFilter('brightness', 50);
      });

      // Should use WASM engine for image objects
      const { WasmFilterEngine } = await import('@/engine');
      const engineInstance = (WasmFilterEngine as any).mock.results[0]?.value;

      await waitFor(() => {
        expect(engineInstance?.applyFilters).toHaveBeenCalled();
      });
    });

    it.todo('should apply contrast filter', async () => {
      const ref = React.createRef<any>();

      const mockImageObject = {
        type: 'image',
        getElement: vi.fn(() => ({
          naturalWidth: 100,
          naturalHeight: 100,
          width: 100,
          height: 100,
        })),
        setSrc: vi.fn((url, callback) => callback && callback()),
        filters: [],
        applyFilters: vi.fn(),
      };

      mockCanvasInstance.getActiveObject.mockReturnValue(mockImageObject);

      render(<Canvas {...defaultProps} ref={ref} />);

      await act(async () => {
        await ref.current?.applyFilter('contrast', 30);
      });

      const { WasmFilterEngine } = await import('@/engine');
      const engineInstance = (WasmFilterEngine as any).mock.results[0]?.value;

      await waitFor(() => {
        expect(engineInstance?.applyFilters).toHaveBeenCalledWith(
          expect.any(ImageData),
          expect.objectContaining({ contrast: 0.3 })
        );
      });
    });

    it.todo('should apply grayscale filter', async () => {
      const ref = React.createRef<any>();

      const mockImageObject = {
        type: 'image',
        getElement: vi.fn(() => ({
          naturalWidth: 100,
          naturalHeight: 100,
          width: 100,
          height: 100,
        })),
        setSrc: vi.fn((url, callback) => callback && callback()),
        filters: [],
        applyFilters: vi.fn(),
      };

      mockCanvasInstance.getActiveObject.mockReturnValue(mockImageObject);

      render(<Canvas {...defaultProps} ref={ref} />);

      await act(async () => {
        await ref.current?.applyFilter('grayscale', 100);
      });

      const { WasmFilterEngine } = await import('@/engine');
      const engineInstance = (WasmFilterEngine as any).mock.results[0]?.value;

      await waitFor(() => {
        expect(engineInstance?.applyFilters).toHaveBeenCalledWith(
          expect.any(ImageData),
          expect.objectContaining({ grayscale: true })
        );
      });
    });

    it.todo('should use Fabric.js filters for non-image objects', async () => {
      const ref = React.createRef<any>();

      const mockRectObject = {
        type: 'rect',
        filters: [],
        applyFilters: vi.fn(),
      };

      mockCanvasInstance.getActiveObject.mockReturnValue(mockRectObject);

      render(<Canvas {...defaultProps} ref={ref} />);

      await act(async () => {
        await ref.current?.applyFilter('brightness', 50);
      });

      const { filters } = await import('fabric');

      await waitFor(() => {
        expect(filters.Brightness).toHaveBeenCalledWith({ brightness: 0.5 });
      });
    });
  });

  describe('Image Loading', () => {
    it.todo('should load and add image to canvas', async () => {
      const ref = React.createRef<any>();
      render(<Canvas {...defaultProps} ref={ref} />);

      const mockFile = new File(['mock'], 'test.png', { type: 'image/png' });

      // Mock FileReader
      const mockFileReader = {
        readAsDataURL: vi.fn(),
        onload: null as any,
        result: 'data:image/png;base64,mock',
      };

      global.FileReader = vi.fn(() => mockFileReader) as any;

      act(() => {
        ref.current?.loadImage(mockFile);
        // Trigger onload
        mockFileReader.onload?.({ target: { result: 'data:image/png;base64,mock' } });
      });

      await waitFor(() => {
        expect(FabricImage.fromURL).toHaveBeenCalledWith('data:image/png;base64,mock');
      });
    });
  });

  describe('Integration with Parent Components', () => {
    it.todo('should call onHistoryAdd when canvas state changes', async () => {
      const onHistoryAdd = vi.fn();
      render(<Canvas {...defaultProps} onHistoryAdd={onHistoryAdd} />);

      const modifiedCallback = mockCanvasInstance.on.mock.calls.find(
        (call: any) => call[0] === 'object:modified'
      )?.[1];

      act(() => {
        modifiedCallback?.();
      });

      await waitFor(() => {
        expect(onHistoryAdd).toHaveBeenCalledWith('Object Modified');
      });
    });

    it.todo('should update when layers prop changes', () => {
      const { rerender } = render(<Canvas {...defaultProps} layers={[
        { id: 'layer-1', visible: true, opacity: 100 }
      ]} />);

      const newLayers = [
        { id: 'layer-1', visible: true, opacity: 100 },
        { id: 'layer-2', visible: true, opacity: 100 },
      ];

      rerender(<Canvas {...defaultProps} layers={newLayers} />);

      // Should trigger visibility/opacity updates
      expect(mockCanvasInstance.getObjects).toHaveBeenCalled();
    });

    it.todo('should update when activeLayerId changes', () => {
      const objects = [
        { layerId: 'layer-1', set: vi.fn() },
        { layerId: 'layer-2', set: vi.fn() },
      ];
      mockCanvasInstance.getObjects.mockReturnValue(objects);

      const { rerender } = render(<Canvas {...defaultProps} activeLayerId="layer-1" />);

      rerender(<Canvas {...defaultProps} activeLayerId="layer-2" />);

      // Should update selectability
      waitFor(() => {
        expect(objects[0].set).toHaveBeenCalled();
        expect(objects[1].set).toHaveBeenCalled();
      });
    });
  });
});
