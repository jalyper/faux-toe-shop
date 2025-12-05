import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, IText, Image as FabricImage, PencilBrush } from 'fabric';
import { filters } from 'fabric';
import { EraserBrush } from '@erase2d/fabric';

const Canvas = forwardRef(({
  activeTool,
  brushSize,
  brushOpacity,
  color,
  zoom,
  backgroundColor,
  layers,
  activeLayerId,
  onHistoryAdd,
  onLayersUpdate
}, ref) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const historyRef = useRef([]);
  const historyStepRef = useRef(0);
  const currentLayerIdRef = useRef(activeLayerId);

  useImperativeHandle(ref, () => ({
    undo: () => {
      if (historyStepRef.current > 0) {
        historyStepRef.current--;
        const canvasState = historyRef.current[historyStepRef.current];
        fabricCanvasRef.current.loadFromJSON(canvasState, () => {
          fabricCanvasRef.current.renderAll();
        });
      }
    },
    redo: () => {
      if (historyStepRef.current < historyRef.current.length - 1) {
        historyStepRef.current++;
        const canvasState = historyRef.current[historyStepRef.current];
        fabricCanvasRef.current.loadFromJSON(canvasState, () => {
          fabricCanvasRef.current.renderAll();
        });
      }
    },
    loadImage: (file) => {
      const reader = new FileReader();
      reader.onload = (e) => {
        FabricImage.fromURL(e.target.result, (img) => {
          img.scaleToWidth(600);
          img.scaleToHeight(400);
          fabricCanvasRef.current.add(img);
          fabricCanvasRef.current.renderAll();
          saveState();
        });
      };
      reader.readAsDataURL(file);
    },
    exportImage: (format) => {
      const dataURL = fabricCanvasRef.current.toDataURL({
        format: format,
        quality: 1
      });
      const link = document.createElement('a');
      link.download = `photoshop-export.${format}`;
      link.href = dataURL;
      link.click();
    },
    applyFilter: (filterType, value) => {
      const activeObject = fabricCanvasRef.current.getActiveObject();
      if (!activeObject || !activeObject.filters) return;

      activeObject.filters = [];

      switch (filterType) {
        case 'brightness':
          activeObject.filters.push(new filters.Brightness({
            brightness: value / 100
          }));
          break;
        case 'contrast':
          activeObject.filters.push(new filters.Contrast({
            contrast: value / 100
          }));
          break;
        case 'saturation':
          activeObject.filters.push(new filters.Saturation({
            saturation: value / 100
          }));
          break;
        case 'blur':
          activeObject.filters.push(new filters.Blur({
            blur: value / 100
          }));
          break;
        case 'grayscale':
          activeObject.filters.push(new filters.Grayscale());
          break;
        case 'sepia':
          activeObject.filters.push(new filters.Sepia());
          break;
        default:
          break;
      }

      activeObject.applyFilters();
      fabricCanvasRef.current.renderAll();
      saveState();
    },
    updateLayers: (updatedLayers) => {
      updateObjectsVisibility();
    },
    deleteLayer: (layerId) => {
      removeLayerObjects(layerId);
    },
    setBackgroundColor: (color) => {
      if (fabricCanvasRef.current) {
        fabricCanvasRef.current.backgroundColor = color;
        fabricCanvasRef.current.renderAll();
      }
    }
  }));

  const saveState = () => {
    const json = JSON.stringify(fabricCanvasRef.current.toJSON());
    historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
    historyRef.current.push(json);
    historyStepRef.current = historyRef.current.length - 1;
  };

  // Convert hex color to rgba with opacity
  const hexToRgba = (hex, opacity) => {
    const r = parseInt(hex.slice(1, 3), 16);
    const g = parseInt(hex.slice(3, 5), 16);
    const b = parseInt(hex.slice(5, 7), 16);
    return `rgba(${r}, ${g}, ${b}, ${opacity / 100})`;
  };

  // Tag newly added objects with current layer ID
  const tagObjectWithLayer = (obj) => {
    if (obj && currentLayerIdRef.current) {
      obj.set('layerId', currentLayerIdRef.current);
    }
  };

  // Update visibility and opacity of all objects based on active layers
  const updateObjectsVisibility = () => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const visibleLayers = layers.filter(l => l.visible).map(l => l.id);
    
    canvas.getObjects().forEach(obj => {
      if (obj.layerId) {
        const layer = layers.find(l => l.id === obj.layerId);
        obj.visible = visibleLayers.includes(obj.layerId);
        
        // Apply layer opacity
        if (layer && layer.opacity !== undefined) {
          obj.opacity = layer.opacity / 100;
        }
      }
    });
    
    canvas.renderAll();
  };

  // Update which objects can be selected based on active layer
  const updateObjectsSelectability = () => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    
    canvas.getObjects().forEach(obj => {
      if (obj.layerId) {
        // Only allow selection of objects on the active layer
        if (obj.layerId === currentLayerIdRef.current) {
          obj.selectable = true;
          obj.evented = true;
        } else {
          obj.selectable = false;
          obj.evented = false;
        }
      }
    });
    
    // Clear any current selection if the selected object is not on active layer
    const activeObject = canvas.getActiveObject();
    if (activeObject && activeObject.layerId !== currentLayerIdRef.current) {
      canvas.discardActiveObject();
      canvas.renderAll();
    }
  };

  // Remove all objects belonging to a specific layer
  const removeLayerObjects = (layerId) => {
    if (!fabricCanvasRef.current) return;
    
    const canvas = fabricCanvasRef.current;
    const objectsToRemove = canvas.getObjects().filter(obj => obj.layerId === layerId);
    
    objectsToRemove.forEach(obj => {
      canvas.remove(obj);
    });
    
    canvas.renderAll();
    saveState();
  };

  useEffect(() => {
    if (!canvasRef.current) return;

    const canvas = new FabricCanvas(canvasRef.current, {
      width: 1200,
      height: 800,
      backgroundColor: '#ffffff'
    });

    fabricCanvasRef.current = canvas;
    saveState();

    canvas.on('object:modified', () => {
      saveState();
      onHistoryAdd('Object Modified');
    });

    canvas.on('object:added', (e) => {
      if (e.target) {
        tagObjectWithLayer(e.target);
        // Make objects erasable by default
        e.target.erasable = true;
      }
      saveState();
    });

    canvas.on('path:created', (e) => {
      if (e.path) {
        // Check if it's an eraser brush
        const isEraser = canvas.freeDrawingBrush instanceof EraserBrush;
        
        if (!isEraser) {
          tagObjectWithLayer(e.path);
          // Make newly created objects erasable by default
          e.path.erasable = true;
        }
      }
    });
    
    // Handle eraser events
    canvas.on('erasing:end', () => {
      saveState();
      onHistoryAdd('Erased');
    });

    return () => {
      canvas.dispose();
    };
  }, []);

  useEffect(() => {
    if (!fabricCanvasRef.current) return;

    const canvas = fabricCanvasRef.current;
    canvas.isDrawingMode = false;
    canvas.selection = true;

    // Remove existing event listeners
    canvas.off('mouse:down');
    canvas.off('mouse:move');
    canvas.off('mouse:up');

    switch (activeTool) {
      case 'brush':
        canvas.isDrawingMode = true;
        if (canvas.freeDrawingBrush) {
          canvas.freeDrawingBrush.color = hexToRgba(color, brushOpacity);
          canvas.freeDrawingBrush.width = brushSize;
        }
        break;
      case 'pencil':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new PencilBrush(canvas);
        canvas.freeDrawingBrush.color = hexToRgba(color, brushOpacity);
        canvas.freeDrawingBrush.width = brushSize;
        break;
      case 'eraser':
        canvas.isDrawingMode = true;
        const eraserBrush = new EraserBrush(canvas);
        eraserBrush.width = brushSize;
        canvas.freeDrawingBrush = eraserBrush;
        
        // Make only objects on current layer erasable
        canvas.getObjects().forEach(obj => {
          if (obj.layerId === currentLayerIdRef.current) {
            obj.erasable = true;
          } else {
            obj.erasable = false;
          }
        });
        break;
      case 'text':
        canvas.isDrawingMode = false;
        canvas.on('mouse:down', function(options) {
          if (activeTool === 'text') {
            const text = new IText('Type here...', {
              left: options.pointer.x,
              top: options.pointer.y,
              fill: color,
              fontSize: 24
            });
            canvas.add(text);
            canvas.setActiveObject(text);
            text.enterEditing();
          }
        });
        break;
      case 'rectangle':
        canvas.isDrawingMode = false;
        let rect, isDown, origX, origY;
        canvas.on('mouse:down', function(o) {
          if (activeTool === 'rectangle') {
            isDown = true;
            const pointer = canvas.getPointer(o.e);
            origX = pointer.x;
            origY = pointer.y;
            rect = new Rect({
              left: origX,
              top: origY,
              fill: color,
              width: 0,
              height: 0
            });
            canvas.add(rect);
          }
        });
        canvas.on('mouse:move', function(o) {
          if (!isDown || activeTool !== 'rectangle') return;
          const pointer = canvas.getPointer(o.e);
          if (origX > pointer.x) {
            rect.set({ left: Math.abs(pointer.x) });
          }
          if (origY > pointer.y) {
            rect.set({ top: Math.abs(pointer.y) });
          }
          rect.set({ width: Math.abs(origX - pointer.x) });
          rect.set({ height: Math.abs(origY - pointer.y) });
          canvas.renderAll();
        });
        canvas.on('mouse:up', function() {
          isDown = false;
          saveState();
          onHistoryAdd('Rectangle Added');
        });
        break;
      case 'circle':
        canvas.isDrawingMode = false;
        let circle, isDownCircle, origXCircle, origYCircle;
        canvas.on('mouse:down', function(o) {
          if (activeTool === 'circle') {
            isDownCircle = true;
            const pointer = canvas.getPointer(o.e);
            origXCircle = pointer.x;
            origYCircle = pointer.y;
            circle = new Circle({
              left: origXCircle,
              top: origYCircle,
              fill: color,
              radius: 0
            });
            canvas.add(circle);
          }
        });
        canvas.on('mouse:move', function(o) {
          if (!isDownCircle || activeTool !== 'circle') return;
          const pointer = canvas.getPointer(o.e);
          const radius = Math.sqrt(Math.pow(origXCircle - pointer.x, 2) + Math.pow(origYCircle - pointer.y, 2)) / 2;
          circle.set({ radius });
          canvas.renderAll();
        });
        canvas.on('mouse:up', function() {
          isDownCircle = false;
          saveState();
          onHistoryAdd('Circle Added');
        });
        break;
      default:
        canvas.isDrawingMode = false;
    }
  }, [activeTool, brushSize, brushOpacity, color]);

  // Zoom is now handled by CSS transform in the container, not by Fabric.js
  // This keeps the canvas size and object sizes constant

  // Update current layer reference when activeLayerId changes
  useEffect(() => {
    currentLayerIdRef.current = activeLayerId;
    
    // Update selectability when switching layers
    updateObjectsSelectability();
    
    // Update erasable property when switching layers
    if (fabricCanvasRef.current && activeTool === 'eraser') {
      fabricCanvasRef.current.getObjects().forEach(obj => {
        if (obj.layerId === activeLayerId) {
          obj.erasable = true;
        } else {
          obj.erasable = false;
        }
      });
      fabricCanvasRef.current.renderAll();
    }
  }, [activeLayerId, activeTool]);

  // Update object visibility when layers change
  useEffect(() => {
    updateObjectsVisibility();
  }, [layers]);

  // Update canvas background color when prop changes
  useEffect(() => {
    if (fabricCanvasRef.current && backgroundColor) {
      fabricCanvasRef.current.backgroundColor = backgroundColor;
      fabricCanvasRef.current.renderAll();
    }
  }, [backgroundColor]);

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto p-4" data-testid="canvas-container">
      <div 
        style={{ 
          transform: `scale(${zoom / 100})`,
          transformOrigin: 'center center',
          transition: 'transform 0.2s ease-out'
        }}
      >
        <canvas ref={canvasRef} className="shadow-lg" data-testid="main-canvas" />
      </div>
    </div>
  );
});

export default Canvas;