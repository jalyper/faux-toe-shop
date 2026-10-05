import React, { useEffect, useRef, forwardRef, useImperativeHandle, useCallback, useMemo, useState } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, IText, Image as FabricImage, PencilBrush } from 'fabric';
import { filters } from 'fabric';
import { EraserBrush } from '@erase2d/fabric';
import PressureSensitiveBrush from './PressureSensitiveBrush';
import { WasmFilterEngine } from '@/engine';

// Performance constants
const MAX_HISTORY_SIZE = 50; // History states for undo/redo

// Simple box blur algorithm for blur tool
const applyBoxBlur = (imageData, radius) => {
  const { data, width, height } = imageData;
  const output = new Uint8ClampedArray(data);

  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      let r = 0, g = 0, b = 0, a = 0, count = 0;

      for (let dy = -radius; dy <= radius; dy++) {
        for (let dx = -radius; dx <= radius; dx++) {
          const nx = x + dx;
          const ny = y + dy;

          if (nx >= 0 && nx < width && ny >= 0 && ny < height) {
            const idx = (ny * width + nx) * 4;
            r += data[idx];
            g += data[idx + 1];
            b += data[idx + 2];
            a += data[idx + 3];
            count++;
          }
        }
      }

      const idx = (y * width + x) * 4;
      output[idx] = r / count;
      output[idx + 1] = g / count;
      output[idx + 2] = b / count;
      output[idx + 3] = a / count;
    }
  }

  return new ImageData(output, width, height);
};

// Generate a circular cursor SVG for brush/pencil tools
const createCircleCursor = (size, color = '#000000') => {
  const cursorSize = Math.max(size, 4); // Minimum cursor size
  const center = cursorSize / 2 + 1; // +1 for stroke width
  const radius = cursorSize / 2;
  const svgSize = cursorSize + 2; // Add padding for stroke

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${svgSize}" height="${svgSize}" viewBox="0 0 ${svgSize} ${svgSize}">
      <circle cx="${center}" cy="${center}" r="${radius}" fill="none" stroke="${color}" stroke-width="1" opacity="0.8"/>
      <circle cx="${center}" cy="${center}" r="1" fill="${color}" opacity="0.8"/>
    </svg>
  `;

  const encoded = encodeURIComponent(svg.trim());
  return `url('data:image/svg+xml,${encoded}') ${center} ${center}, crosshair`;
};

const Canvas = forwardRef(({
  activeTool,
  brushSize,
  brushOpacity,
  pressureSensitivity,
  color,
  zoom,
  backgroundColor,
  layers,
  activeLayerId,
  onHistoryAdd,
  onLayersUpdate,
  onColorPick
}, ref) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const historyRef = useRef([]);
  const historyStepRef = useRef(0);
  const currentLayerIdRef = useRef(activeLayerId);
  const renderTimeoutRef = useRef(null);
  const [currentCursor, setCurrentCursor] = useState('default');

  // WASM Filter Engine for high-performance image processing
  const wasmEngineRef = useRef(null);
  const [isWasmReady, setIsWasmReady] = useState(false);

  // Initialize WASM engine
  useEffect(() => {
    const engine = new WasmFilterEngine();
    wasmEngineRef.current = engine;
    engine.init().then((ready) => {
      setIsWasmReady(ready);
      console.log(`[Canvas] WASM Filter Engine: ${ready ? 'Active' : 'JS Fallback'}`);
    });
  }, []);

  // Debounced render for performance - uses requestAnimationFrame
  const debouncedRender = useCallback(() => {
    if (renderTimeoutRef.current) {
      cancelAnimationFrame(renderTimeoutRef.current);
    }
    renderTimeoutRef.current = requestAnimationFrame(() => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.renderAll();
      }
    });
  }, []);

  // Immediate render for critical operations
  const immediateRender = useCallback(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.renderAll();
    }
  }, []);

  // Optimized saveState with history size limit
  // Stores canvas state WITH backgroundColor for proper undo/redo
  const saveState = useCallback(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    // Include backgroundColor in the saved state
    const state = {
      canvasJSON: canvas.toJSON(),
      backgroundColor: canvas.backgroundColor
    };
    const stateString = JSON.stringify(state);

    historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
    historyRef.current.push(stateString);

    // Enforce history size limit (10 states)
    if (historyRef.current.length > MAX_HISTORY_SIZE) {
      const overflow = historyRef.current.length - MAX_HISTORY_SIZE;
      historyRef.current = historyRef.current.slice(overflow);
      historyStepRef.current = Math.max(0, historyStepRef.current - overflow);
    } else {
      historyStepRef.current = historyRef.current.length - 1;
    }
  }, []);

  const hexToRgba = useCallback((hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  }, []);

  const tagObjectWithLayer = useCallback((obj) => {
    if (obj && currentLayerIdRef.current) {
      obj.set('layerId', currentLayerIdRef.current);
    }
  }, []);

  // Memoized layer lookup for O(1) access instead of O(n)
  const layerMaps = useMemo(() => {
    const visibleSet = new Set(layers.filter(l => l.visible).map(l => l.id));
    const opacityMap = new Map(layers.map(l => [l.id, l.opacity]));
    return { visibleSet, opacityMap };
  }, [layers]);

  const updateObjectsVisibility = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const { visibleSet, opacityMap } = layerMaps;

    canvas.getObjects().forEach(obj => {
      if (obj.layerId) {
        obj.set({
          visible: visibleSet.has(obj.layerId),
          opacity: (opacityMap.get(obj.layerId) ?? 100) / 100
        });
      }
    });
    debouncedRender();
  }, [layerMaps, debouncedRender]);

  const updateObjectsSelectability = useCallback(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const activeLayer = currentLayerIdRef.current;

    canvas.getObjects().forEach(obj => {
      if (obj.layerId) {
        const isActiveLayer = obj.layerId === activeLayer;
        obj.set({ selectable: isActiveLayer, evented: isActiveLayer });
      }
    });

    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.layerId !== activeLayer) {
      canvas.discardActiveObject();
      debouncedRender();
    }
  }, [debouncedRender]);

  const removeLayerObjects = useCallback((layerId) => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    const objectsToRemove = canvas.getObjects().filter(obj => obj.layerId === layerId);
    objectsToRemove.forEach(obj => canvas.remove(obj));
    immediateRender();
    saveState();
  }, [saveState, immediateRender]);

  useImperativeHandle(ref, () => ({
    undo: async () => {
      if (historyStepRef.current > 0) {
        historyStepRef.current--;
        const savedState = JSON.parse(historyRef.current[historyStepRef.current]);

        // Handle both old format (just JSON) and new format (with backgroundColor)
        const canvasJSON = savedState.canvasJSON || savedState;
        const bgColor = savedState.backgroundColor || '#ffffff';

        // Fabric.js v6 returns a Promise
        await fabricCanvasRef.current.loadFromJSON(canvasJSON);
        // Restore backgroundColor after loading
        fabricCanvasRef.current.backgroundColor = bgColor;
        immediateRender();
      }
    },
    redo: async () => {
      if (historyStepRef.current < historyRef.current.length - 1) {
        historyStepRef.current++;
        const savedState = JSON.parse(historyRef.current[historyStepRef.current]);

        // Handle both old format (just JSON) and new format (with backgroundColor)
        const canvasJSON = savedState.canvasJSON || savedState;
        const bgColor = savedState.backgroundColor || '#ffffff';

        // Fabric.js v6 returns a Promise
        await fabricCanvasRef.current.loadFromJSON(canvasJSON);
        // Restore backgroundColor after loading
        fabricCanvasRef.current.backgroundColor = bgColor;
        immediateRender();
      }
    },
    loadImage: async (file) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        // Fabric.js v6 returns a Promise
        const img = await FabricImage.fromURL(e.target.result);
        img.scaleToWidth(600);
        img.scaleToHeight(400);
        fabricCanvasRef.current.add(img);
        immediateRender();
        saveState();
      };
      reader.readAsDataURL(file);
    },
    exportImage: (format) => {
      const dataURL = fabricCanvasRef.current.toDataURL({ format, quality: 1 });
      const link = document.createElement('a');
      link.download = `photoshop-export.${format}`;
      link.href = dataURL;
      link.click();
    },
    applyFilter: async (filterType, value) => {
      const activeObject = fabricCanvasRef.current.getActiveObject();
      if (!activeObject) return;

      const engine = wasmEngineRef.current;
      const isImage = activeObject.type === 'image';

      // Use WASM for image objects (much faster for raster processing)
      if (isImage && engine) {
        const startTime = performance.now();

        // Get the image element from Fabric
        const imgElement = activeObject.getElement();
        if (!imgElement) return;

        // Create a temporary canvas to get ImageData
        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = imgElement.naturalWidth || imgElement.width;
        tempCanvas.height = imgElement.naturalHeight || imgElement.height;
        const tempCtx = tempCanvas.getContext('2d');
        tempCtx.drawImage(imgElement, 0, 0);

        const imageData = tempCtx.getImageData(0, 0, tempCanvas.width, tempCanvas.height);

        // Build filter options
        const filterOptions = {};
        switch (filterType) {
          case 'brightness': filterOptions.brightness = value / 100; break;
          case 'contrast': filterOptions.contrast = value / 100; break;
          case 'saturation': filterOptions.saturation = value / 100; break;
          case 'blur': filterOptions.blur = value; break;
          case 'grayscale': filterOptions.grayscale = true; break;
          case 'sepia': filterOptions.sepia = true; break;
          default: break;
        }

        // Apply WASM filter
        const filtered = await engine.applyFilters(imageData, filterOptions);

        // Put filtered data back
        tempCtx.putImageData(filtered, 0, 0);

        // Update Fabric image with filtered result
        const dataUrl = tempCanvas.toDataURL();
        activeObject.setSrc(dataUrl, () => {
          immediateRender();
          saveState();
        });

        const endTime = performance.now();
        console.log(`[Canvas] WASM filter "${filterType}" applied in ${(endTime - startTime).toFixed(2)}ms`);
        return;
      }

      // Fallback to Fabric.js filters for non-image objects
      if (!activeObject.filters) return;
      activeObject.filters = [];
      switch (filterType) {
        case 'brightness': activeObject.filters.push(new filters.Brightness({ brightness: value / 100 })); break;
        case 'contrast': activeObject.filters.push(new filters.Contrast({ contrast: value / 100 })); break;
        case 'saturation': activeObject.filters.push(new filters.Saturation({ saturation: value / 100 })); break;
        case 'blur': activeObject.filters.push(new filters.Blur({ blur: value / 100 })); break;
        case 'grayscale': activeObject.filters.push(new filters.Grayscale()); break;
        case 'sepia': activeObject.filters.push(new filters.Sepia()); break;
        default: break;
      }
      activeObject.applyFilters();
      immediateRender();
      saveState();
    },
    updateLayers: () => updateObjectsVisibility(),
    deleteLayer: (layerId) => removeLayerObjects(layerId),
    setBackgroundColor: (color, shouldSaveState = true) => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.backgroundColor = color;
        immediateRender();
        if (shouldSaveState) {
          saveState();
        }
      }
    },
    getCanvasDataUrl: () => {
      if (fabricCanvasRef.current) {
        return fabricCanvasRef.current.toDataURL({ format: 'png', quality: 1 });
      }
      return null;
    },
    getCanvasJSON: () => {
      if (fabricCanvasRef.current) {
        return JSON.stringify({
          canvasJSON: fabricCanvasRef.current.toJSON(),
          backgroundColor: fabricCanvasRef.current.backgroundColor
        });
      }
      return null;
    },
    loadCanvasData: async (jsonData) => {
      if (fabricCanvasRef.current && jsonData) {
        try {
          const parsed = JSON.parse(jsonData);
          const canvasJSON = parsed.canvasJSON || parsed;
          const bgColor = parsed.backgroundColor || '#ffffff';
          await fabricCanvasRef.current.loadFromJSON(canvasJSON);
          fabricCanvasRef.current.backgroundColor = bgColor;
          immediateRender();
          // Reset history for loaded project
          historyRef.current = [];
          historyStepRef.current = -1;
          saveState();
        } catch (e) {
          console.error('Failed to load canvas data:', e);
        }
      }
    }
  }));

  useEffect(() => {
    if (!canvasRef.current) return;
    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1200, height: 800, backgroundColor: '#ffffff',
      renderOnAddRemove: false, enableRetinaScaling: true
    });
    fabricCanvasRef.current = canvas;
    saveState();

    canvas.on('object:modified', () => { saveState(); onHistoryAdd('Object Modified'); });
    canvas.on('object:added', (e) => {
      if (e.target) { tagObjectWithLayer(e.target); e.target.erasable = true; }
    });
    canvas.on('path:created', (e) => {
      if (e.path) {
        const isEraser = canvas.freeDrawingBrush instanceof EraserBrush;
        if (!isEraser) {
          tagObjectWithLayer(e.path);
          e.path.erasable = true;
          saveState();
          onHistoryAdd('Brush Stroke');
        }
      }
    });
    canvas.on('erasing:end', () => { saveState(); onHistoryAdd('Erased'); });

    return () => {
      if (renderTimeoutRef.current) cancelAnimationFrame(renderTimeoutRef.current);
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvasRef.current) return;
    const canvas = fabricCanvasRef.current;
    canvas.isDrawingMode = false;
    canvas.selection = true;
    canvas.off('mouse:down'); canvas.off('mouse:move'); canvas.off('mouse:up');

    switch (activeTool) {
      case 'brush':
        canvas.isDrawingMode = true;
        // Set circle cursor that matches brush size
        const brushCursor = createCircleCursor(brushSize, '#ffffff');
        canvas.freeDrawingCursor = brushCursor;
        canvas.defaultCursor = brushCursor;
        setCurrentCursor(brushCursor);
        if (pressureSensitivity) {
          const pressureBrush = new PressureSensitiveBrush(canvas);
          pressureBrush.color = hexToRgba(color, brushOpacity);
          pressureBrush.baseWidth = brushSize;
          pressureBrush.width = brushSize;
          pressureBrush.simulatePressure = true;
          canvas.freeDrawingBrush = pressureBrush;
        } else {
          const regularBrush = new PencilBrush(canvas);
          regularBrush.color = hexToRgba(color, brushOpacity);
          regularBrush.width = brushSize;
          canvas.freeDrawingBrush = regularBrush;
        }
        break;
      case 'pencil':
        canvas.isDrawingMode = true;
        // Set circle cursor that matches brush size
        const pencilCursor = createCircleCursor(brushSize, '#ffffff');
        canvas.freeDrawingCursor = pencilCursor;
        canvas.defaultCursor = pencilCursor;
        setCurrentCursor(pencilCursor);
        if (pressureSensitivity) {
          const pressurePencil = new PressureSensitiveBrush(canvas);
          pressurePencil.color = hexToRgba(color, brushOpacity);
          pressurePencil.baseWidth = brushSize;
          pressurePencil.width = brushSize;
          pressurePencil.simulatePressure = true;
          canvas.freeDrawingBrush = pressurePencil;
        } else {
          const regularPencil = new PencilBrush(canvas);
          regularPencil.color = hexToRgba(color, brushOpacity);
          regularPencil.width = brushSize;
          canvas.freeDrawingBrush = regularPencil;
        }
        break;
      case 'eraser':
        canvas.isDrawingMode = true;
        // Set circle cursor for eraser too
        const eraserCursor = createCircleCursor(brushSize, '#ff6666');
        canvas.freeDrawingCursor = eraserCursor;
        canvas.defaultCursor = eraserCursor;
        setCurrentCursor(eraserCursor);
        const eraserBrush = new EraserBrush(canvas);
        eraserBrush.width = brushSize;
        canvas.freeDrawingBrush = eraserBrush;
        canvas.getObjects().forEach(obj => { obj.erasable = obj.layerId === currentLayerIdRef.current; });
        break;
      case 'text':
        canvas.isDrawingMode = false;
        canvas.on('mouse:down', function (options) {
          if (activeTool === 'text') {
            const text = new IText('Type here...', { left: options.pointer.x, top: options.pointer.y, fill: color, fontSize: 24 });
            canvas.add(text);
            canvas.setActiveObject(text);
            text.enterEditing();
            immediateRender();
          }
        });
        break;
      case 'rectangle':
        canvas.isDrawingMode = false;
        let rect, isDown, origX, origY;
        canvas.on('mouse:down', function (o) {
          if (activeTool === 'rectangle') {
            isDown = true;
            const pointer = canvas.getPointer(o.e);
            origX = pointer.x; origY = pointer.y;
            rect = new Rect({ left: origX, top: origY, fill: color, width: 0, height: 0 });
            canvas.add(rect);
          }
        });
        canvas.on('mouse:move', function (o) {
          if (!isDown || activeTool !== 'rectangle') return;
          const pointer = canvas.getPointer(o.e);
          if (origX > pointer.x) rect.set({ left: Math.abs(pointer.x) });
          if (origY > pointer.y) rect.set({ top: Math.abs(pointer.y) });
          rect.set({ width: Math.abs(origX - pointer.x), height: Math.abs(origY - pointer.y) });
          debouncedRender();
        });
        canvas.on('mouse:up', function () { isDown = false; immediateRender(); saveState(); onHistoryAdd('Rectangle Added'); });
        break;
      case 'circle':
        canvas.isDrawingMode = false;
        let circle, isDownCircle, origXCircle, origYCircle;
        canvas.on('mouse:down', function (o) {
          if (activeTool === 'circle') {
            isDownCircle = true;
            const pointer = canvas.getPointer(o.e);
            origXCircle = pointer.x; origYCircle = pointer.y;
            circle = new Circle({ left: origXCircle, top: origYCircle, fill: color, radius: 0 });
            canvas.add(circle);
          }
        });
        canvas.on('mouse:move', function (o) {
          if (!isDownCircle || activeTool !== 'circle') return;
          const pointer = canvas.getPointer(o.e);
          const radius = Math.sqrt(Math.pow(origXCircle - pointer.x, 2) + Math.pow(origYCircle - pointer.y, 2)) / 2;
          circle.set({ radius });
          debouncedRender();
        });
        canvas.on('mouse:up', function () { isDownCircle = false; immediateRender(); saveState(); onHistoryAdd('Circle Added'); });
        break;
      case 'blur':
        canvas.isDrawingMode = false;
        canvas.selection = false;
        const blurCursor = createCircleCursor(brushSize, '#00aaff');
        canvas.defaultCursor = blurCursor;
        canvas.hoverCursor = blurCursor;
        setCurrentCursor(blurCursor);
        canvas.getObjects().forEach(obj => {
          obj.set({ selectable: false, evented: false });
        });
        canvas.discardActiveObject();
        immediateRender();

        let isBlurring = false;
        let blurPoints = [];

        canvas.on('mouse:down', function (o) {
          if (activeTool !== 'blur') return;
          isBlurring = true;
          blurPoints = [];
          const pointer = canvas.getPointer(o.e);
          blurPoints.push({ x: pointer.x, y: pointer.y });
        });

        canvas.on('mouse:move', function (o) {
          if (!isBlurring || activeTool !== 'blur') return;
          const pointer = canvas.getPointer(o.e);
          blurPoints.push({ x: pointer.x, y: pointer.y });

          // Apply blur in real-time for each point
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');

          // Draw current canvas content
          tempCtx.fillStyle = canvas.backgroundColor || '#ffffff';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          tempCtx.drawImage(canvas.lowerCanvasEl, 0, 0);

          // Apply blur to the area under the brush
          const x = Math.max(0, Math.round(pointer.x - brushSize));
          const y = Math.max(0, Math.round(pointer.y - brushSize));
          const size = brushSize * 2;
          const width = Math.min(size, tempCanvas.width - x);
          const height = Math.min(size, tempCanvas.height - y);

          if (width > 0 && height > 0) {
            const imageData = tempCtx.getImageData(x, y, width, height);

            // Simple box blur
            const blurRadius = Math.max(1, Math.floor(brushOpacity / 20)); // Use opacity as blur strength
            const blurredData = applyBoxBlur(imageData, blurRadius);

            tempCtx.putImageData(blurredData, x, y);

            // Update the canvas background with the blurred content
            const dataUrl = tempCanvas.toDataURL();
            FabricImage.fromURL(dataUrl).then((img) => {
              // Remove previous blur layer if exists
              const existingBlurLayer = canvas.getObjects().find(obj => obj.isBlurLayer);
              if (existingBlurLayer) {
                canvas.remove(existingBlurLayer);
              }
              img.set({ isBlurLayer: true, selectable: false, evented: false });
              canvas.insertAt(0, img);
              immediateRender();
            });
          }
        });

        canvas.on('mouse:up', function () {
          if (!isBlurring || activeTool !== 'blur') return;
          isBlurring = false;

          // Flatten the blur layer into the canvas
          const blurLayer = canvas.getObjects().find(obj => obj.isBlurLayer);
          if (blurLayer) {
            // The blur is already applied, just save state
            saveState();
            onHistoryAdd('Blur Applied');
          }
          blurPoints = [];
        });
        break;
      case 'eyedropper':
        canvas.isDrawingMode = false;
        canvas.selection = false;
        canvas.defaultCursor = 'crosshair';
        canvas.hoverCursor = 'crosshair';
        // Disable selection on all objects so eyedropper doesn't select them
        canvas.getObjects().forEach(obj => {
          obj.set({ selectable: false, evented: false });
        });
        canvas.discardActiveObject();
        immediateRender();
        canvas.on('mouse:down', function (o) {
          if (activeTool !== 'eyedropper' || !onColorPick) return;
          const pointer = canvas.getPointer(o.e);
          // Fabric.js has two canvases - lowerCanvasEl has the actual content
          // We need to create a temporary canvas with all content rendered
          const tempCanvas = document.createElement('canvas');
          tempCanvas.width = canvas.width;
          tempCanvas.height = canvas.height;
          const tempCtx = tempCanvas.getContext('2d');
          // Draw background color first
          tempCtx.fillStyle = canvas.backgroundColor || '#ffffff';
          tempCtx.fillRect(0, 0, tempCanvas.width, tempCanvas.height);
          // Draw the lower canvas content on top
          tempCtx.drawImage(canvas.lowerCanvasEl, 0, 0);
          // Sample the pixel at the clicked position
          const x = Math.round(pointer.x);
          const y = Math.round(pointer.y);
          const pixelData = tempCtx.getImageData(x, y, 1, 1).data;
          // Convert RGB to hex
          const r = pixelData[0].toString(16).padStart(2, '0');
          const g = pixelData[1].toString(16).padStart(2, '0');
          const b = pixelData[2].toString(16).padStart(2, '0');
          const hexColor = `#${r}${g}${b}`;
          onColorPick(hexColor);
        });
        break;
      case 'select':
      case 'move':
      default:
        canvas.isDrawingMode = false;
        setCurrentCursor('default');
        updateObjectsSelectability();
        break;
    }
  }, [activeTool, brushSize, brushOpacity, color, pressureSensitivity, hexToRgba, debouncedRender, immediateRender, saveState, updateObjectsSelectability, onHistoryAdd, onColorPick]);

  useEffect(() => {
    currentLayerIdRef.current = activeLayerId;
    updateObjectsSelectability();
    if (fabricCanvasRef.current && activeTool === 'eraser') {
      fabricCanvasRef.current.getObjects().forEach(obj => { obj.erasable = obj.layerId === activeLayerId; });
      debouncedRender();
    }
  }, [activeLayerId, activeTool, updateObjectsSelectability, debouncedRender]);

  useEffect(() => { updateObjectsVisibility(); }, [layers, updateObjectsVisibility]);

  useEffect(() => {
    if (fabricCanvasRef.current && backgroundColor) {
      fabricCanvasRef.current.backgroundColor = backgroundColor;
      debouncedRender();
    }
  }, [backgroundColor, debouncedRender]);

  // Determine if we're in a drawing mode (brush, pencil, eraser, blur)
  const isDrawingTool = activeTool === 'brush' || activeTool === 'pencil' || activeTool === 'eraser' || activeTool === 'blur';

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto p-4" data-testid="canvas-container">
      {/* CSS to keep cursor visible during drawing */}
      {isDrawingTool && (
        <style>{`
          .canvas-container canvas {
            cursor: ${currentCursor} !important;
          }
        `}</style>
      )}
      <div
        className="canvas-container"
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease-out',
          cursor: isDrawingTool ? currentCursor : 'default'
        }}
      >
        <canvas ref={canvasRef} className="shadow-lg" data-testid="main-canvas" />
      </div>
    </div>
  );
});

export default Canvas;
