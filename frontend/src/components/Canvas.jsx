import React, { useEffect, useRef, forwardRef, useImperativeHandle } from 'react';
import { Canvas as FabricCanvas, Circle, Rect, IText, Image as FabricImage, PencilBrush } from 'fabric';
import { filters } from 'fabric';

const Canvas = forwardRef(({
  activeTool,
  brushSize,
  color,
  zoom,
  layers,
  activeLayerId,
  onHistoryAdd,
  onLayersUpdate
}, ref) => {
  const canvasRef = useRef(null);
  const fabricCanvasRef = useRef(null);
  const historyRef = useRef([]);
  const historyStepRef = useRef(0);

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
      // Layer management logic
    }
  }));

  const saveState = () => {
    const json = JSON.stringify(fabricCanvasRef.current.toJSON());
    historyRef.current = historyRef.current.slice(0, historyStepRef.current + 1);
    historyRef.current.push(json);
    historyStepRef.current = historyRef.current.length - 1;
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

    canvas.on('object:added', () => {
      saveState();
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

    switch (activeTool) {
      case 'brush':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = brushSize;
        break;
      case 'pencil':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush = new PencilBrush(canvas);
        canvas.freeDrawingBrush.color = color;
        canvas.freeDrawingBrush.width = brushSize;
        break;
      case 'eraser':
        canvas.isDrawingMode = true;
        canvas.freeDrawingBrush.color = '#ffffff';
        canvas.freeDrawingBrush.width = brushSize;
        break;
      case 'text':
        canvas.isDrawingMode = false;
        canvas.on('mouse:down', function(options) {
          if (activeTool === 'text') {
            const text = new fabric.IText('Type here...', {
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
            rect = new fabric.Rect({
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
            circle = new fabric.Circle({
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
  }, [activeTool, brushSize, color]);

  useEffect(() => {
    if (fabricCanvasRef.current) {
      fabricCanvasRef.current.setZoom(zoom / 100);
    }
  }, [zoom]);

  return (
    <div className="flex-1 flex items-center justify-center overflow-auto p-4">
      <canvas ref={canvasRef} className="shadow-lg" />
    </div>
  );
});

export default Canvas;