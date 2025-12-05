import React, { useState, useRef, useEffect } from 'react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import LayersPanel from './LayersPanel';
import PropertiesPanel from './PropertiesPanel';
import HistoryPanel from './HistoryPanel';
import ColorPicker from './ColorPicker';
import MenuBar from './MenuBar';
import { toast } from '../hooks/use-toast';

const PhotoshopEditor = () => {
  // Initialize with Background layer
  const backgroundLayer = {
    id: 'background',
    name: 'Background',
    type: 'background',
    visible: true,
    opacity: 100,
    locked: false,
    isBackground: true
  };
  
  const [activeTool, setActiveTool] = useState('select');
  const [brushSize, setBrushSize] = useState(5);
  const [color, setColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [layers, setLayers] = useState([backgroundLayer]);
  const [activeLayerId, setActiveLayerId] = useState('background');
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [zoom, setZoom] = useState(100);
  const canvasRef = useRef(null);

  const addToHistory = (action) => {
    const newHistory = history.slice(0, historyStep + 1);
    newHistory.push({
      id: Date.now(),
      action,
      timestamp: new Date().toLocaleTimeString()
    });
    setHistory(newHistory);
    setHistoryStep(newHistory.length - 1);
  };

  const undo = () => {
    if (historyStep > 0) {
      setHistoryStep(historyStep - 1);
      if (canvasRef.current) {
        canvasRef.current.undo();
      }
    }
  };

  const redo = () => {
    if (historyStep < history.length - 1) {
      setHistoryStep(historyStep + 1);
      if (canvasRef.current) {
        canvasRef.current.redo();
      }
    }
  };

  const handleFileUpload = (file) => {
    if (canvasRef.current) {
      canvasRef.current.loadImage(file);
      addToHistory('Image Loaded');
    }
  };

  const handleExport = (format) => {
    if (canvasRef.current) {
      canvasRef.current.exportImage(format);
      toast({
        title: "Export Successful",
        description: `Image exported as ${format.toUpperCase()}`
      });
    }
  };

  const applyFilter = (filterType, value) => {
    if (canvasRef.current) {
      canvasRef.current.applyFilter(filterType, value);
      addToHistory(`Applied ${filterType} filter`);
    }
  };

  const handleLayerUpdate = (updatedLayers) => {
    // Check if any layers were deleted
    const deletedLayers = layers.filter(oldLayer => 
      !updatedLayers.find(newLayer => newLayer.id === oldLayer.id)
    );
    
    // Remove canvas objects for deleted layers
    if (canvasRef.current && deletedLayers.length > 0) {
      deletedLayers.forEach(layer => {
        canvasRef.current.deleteLayer(layer.id);
      });
    }
    
    setLayers(updatedLayers);
    if (canvasRef.current) {
      canvasRef.current.updateLayers(updatedLayers);
    }
  };

  const handleLayerAdd = (type) => {
    const newLayer = {
      id: Date.now(),
      name: `Layer ${layers.length + 1}`,
      type,
      visible: true,
      opacity: 100,
      locked: false
    };
    const updatedLayers = [...layers, newLayer];
    setLayers(updatedLayers);
    setActiveLayerId(newLayer.id);
    addToHistory(`Added ${type} layer`);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStep, history]);

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-white">
      <MenuBar 
        onFileUpload={handleFileUpload}
        onExport={handleExport}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyStep > 0}
        canRedo={historyStep < history.length - 1}
      />
      
      <div className="flex flex-1 overflow-hidden">
        <Toolbar 
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
        />
        
        <div className="flex-1 flex flex-col bg-[#2d2d2d]">
          <div className="flex items-center justify-center p-2 bg-[#1e1e1e] border-b border-[#3e3e3e]">
            <div className="flex items-center gap-4">
              <span className="text-sm">Zoom: {zoom}%</span>
              <input 
                type="range" 
                min="10" 
                max="400" 
                value={zoom} 
                onChange={(e) => setZoom(parseInt(e.target.value))}
                className="w-32"
              />
            </div>
          </div>
          
          <Canvas 
            ref={canvasRef}
            activeTool={activeTool}
            brushSize={brushSize}
            color={color}
            zoom={zoom}
            layers={layers}
            activeLayerId={activeLayerId}
            onHistoryAdd={addToHistory}
            onLayersUpdate={setLayers}
          />
          
          <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-t border-[#3e3e3e]">
            <span className="text-xs text-gray-400">Document: Untitled-1</span>
            <ColorPicker color={color} setColor={setColor} />
          </div>
        </div>
        
        <div className="w-80 bg-[#262626] border-l border-[#3e3e3e] overflow-y-auto">
          <div className="p-4 border-b border-[#3e3e3e]">
            <PropertiesPanel 
              applyFilter={applyFilter}
              activeTool={activeTool}
            />
          </div>
          
          <div className="p-4 border-b border-[#3e3e3e]">
            <LayersPanel 
              layers={layers}
              activeLayerId={activeLayerId}
              setActiveLayerId={setActiveLayerId}
              onLayersUpdate={handleLayerUpdate}
              onLayerAdd={handleLayerAdd}
            />
          </div>
          
          <div className="p-4">
            <HistoryPanel 
              history={history}
              historyStep={historyStep}
              onUndo={undo}
              onRedo={redo}
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default PhotoshopEditor;