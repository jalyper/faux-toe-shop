import React, { useState, useRef, useEffect } from 'react';
import Canvas from './Canvas';
import Toolbar from './Toolbar';
import LayersPanel from './LayersPanel';
import PropertiesPanel from './PropertiesPanel';
import HistoryPanel from './HistoryPanel';
import ColorPicker from './ColorPicker';
import MenuBar from './MenuBar';
import { toast } from '../hooks/use-toast';
import {
  serializeProject,
  saveProject,
  saveProjectAs,
  openProject as openProjectFromFile,
  isFileSystemAccessSupported,
  setCurrentFileHandle,
  readFtsFile
} from '../utils/ftsFormat';

const PhotoshopEditor = () => {
  // Initialize with Background layer
  const backgroundLayer = {
    id: 'background',
    name: 'Background',
    type: 'background',
    visible: true,
    opacity: 100,
    locked: false,
    isBackground: true,
    adjustments: {
      brightness: 0,
      contrast: 0,
      saturation: 0,
      blur: 0
    }
  };

  const [activeTool, setActiveTool] = useState('select');
  const [brushSize, setBrushSize] = useState(5);
  const [brushOpacity, setBrushOpacity] = useState(100);
  const [pressureSensitivity, setPressureSensitivity] = useState(true); // Enabled by default
  const [color, setColor] = useState('#000000');
  const [backgroundColor, setBackgroundColor] = useState('#ffffff');
  const [layers, setLayers] = useState([backgroundLayer]);
  const [activeLayerId, setActiveLayerId] = useState('background');
  const [history, setHistory] = useState([]);
  const [historyStep, setHistoryStep] = useState(-1);
  const [zoom, setZoom] = useState(100);
  const [projectName, setProjectName] = useState('Untitled-1');
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [autoSaveEnabled, setAutoSaveEnabled] = useState(true);
  const canvasRef = useRef(null);
  const projectFileInputRef = useRef(null);
  const autoSaveTimerRef = useRef(null);
  const AUTO_SAVE_INTERVAL = 60000; // Auto-save every 60 seconds

  // Use refs to track history state for immediate access (avoids stale closures)
  const historyRef = useRef([]);
  const historyStepRef = useRef(-1);

  // Keep refs in sync with state
  useEffect(() => {
    historyRef.current = history;
    historyStepRef.current = historyStep;
  }, [history, historyStep]);

  const addToHistory = (action) => {
    setHistory(prevHistory => {
      const newHistory = prevHistory.slice(0, historyStepRef.current + 1);
      newHistory.push({
        id: Date.now(),
        action,
        timestamp: new Date().toLocaleTimeString()
      });
      historyRef.current = newHistory;
      return newHistory;
    });
    setHistoryStep(prev => {
      const newStep = historyRef.current.length - 1;
      historyStepRef.current = newStep;
      return newStep;
    });
    setHasUnsavedChanges(true);
  };

  const undo = () => {
    if (historyStepRef.current >= 0) {
      historyStepRef.current--;
      setHistoryStep(historyStepRef.current);
      if (canvasRef.current) {
        canvasRef.current.undo();
      }
    }
  };

  const redo = () => {
    if (historyStepRef.current < historyRef.current.length - 1) {
      historyStepRef.current++;
      setHistoryStep(historyStepRef.current);
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
      locked: false,
      adjustments: {
        brightness: 0,
        contrast: 0,
        saturation: 0,
        blur: 0
      }
    };
    const updatedLayers = [...layers, newLayer];
    setLayers(updatedLayers);
    setActiveLayerId(newLayer.id);
    addToHistory(`Added ${type} layer`);
  };

  const handleBackgroundColorChange = (newColor) => {
    setBackgroundColor(newColor);
    if (canvasRef.current) {
      canvasRef.current.setBackgroundColor(newColor);
      addToHistory('Background Color Changed');
    }
  };

  // Save project (Ctrl+S) - saves to existing file or prompts for location
  const handleSaveProject = async () => {
    if (!canvasRef.current) return;

    const canvasJSON = canvasRef.current.getCanvasJSON?.() || null;
    const ftsContent = serializeProject({
      canvas: { width: 1200, height: 800 },
      layers,
      activeLayerId,
      canvasJSON,
      backgroundColor
    });

    try {
      const result = await saveProject(ftsContent, projectName);
      if (result.success) {
        setHasUnsavedChanges(false);
        setLastSaveTime(new Date());
        if (result.fileName) {
          setProjectName(result.fileName.replace('.fts', ''));
        }
        toast({
          title: "Project Saved",
          description: `Saved as ${result.fileName}`
        });
      }
    } catch (error) {
      toast({
        title: "Error Saving Project",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Save As - always prompts for new location
  const handleSaveProjectAs = async () => {
    if (!canvasRef.current) return;

    const canvasJSON = canvasRef.current.getCanvasJSON?.() || null;
    const ftsContent = serializeProject({
      canvas: { width: 1200, height: 800 },
      layers,
      activeLayerId,
      canvasJSON,
      backgroundColor
    });

    try {
      const result = await saveProjectAs(ftsContent, projectName);
      if (result.success) {
        setHasUnsavedChanges(false);
        setLastSaveTime(new Date());
        if (result.fileName) {
          setProjectName(result.fileName.replace('.fts', ''));
        }
        toast({
          title: "Project Saved",
          description: `Saved as ${result.fileName}`
        });
      }
    } catch (error) {
      toast({
        title: "Error Saving Project",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Restore project state from loaded data
  const restoreProject = async (project, fileName) => {
    // Restore layers
    setLayers(project.layers);

    // Restore active layer
    if (project.activeLayerId) {
      setActiveLayerId(project.activeLayerId);
    } else if (project.layers.length > 0) {
      setActiveLayerId(project.layers[0].id);
    }

    // Restore background color
    if (project.canvas.backgroundColor) {
      setBackgroundColor(project.canvas.backgroundColor);
      if (canvasRef.current) {
        canvasRef.current.setBackgroundColor(project.canvas.backgroundColor, false);
      }
    }

    // Load canvas data if available
    if (project.canvasData && canvasRef.current) {
      await canvasRef.current.loadCanvasData?.(project.canvasData);
    }

    // Set project name
    setProjectName(fileName);

    // Clear history for new project
    setHistory([]);
    setHistoryStep(-1);
    setHasUnsavedChanges(false);
    setLastSaveTime(null);

    toast({
      title: "Project Opened",
      description: `Loaded ${fileName}`
    });
  };

  // Open project using File System Access API
  const handleOpenProject = async () => {
    if (isFileSystemAccessSupported()) {
      try {
        const result = await openProjectFromFile();
        if (result) {
          await restoreProject(result.project, result.fileName);
        }
      } catch (error) {
        toast({
          title: "Error Opening Project",
          description: error.message,
          variant: "destructive"
        });
      }
    } else {
      // Fallback to file input for unsupported browsers
      projectFileInputRef.current?.click();
    }
  };

  // Fallback handler for file input (unsupported browsers)
  const handleFileInputChange = async (file) => {
    try {
      const project = await readFtsFile(file);
      const fileName = file.name.replace('.fts', '');
      setCurrentFileHandle(null); // No file handle in fallback mode
      await restoreProject(project, fileName);
    } catch (error) {
      toast({
        title: "Error Opening Project",
        description: error.message,
        variant: "destructive"
      });
    }
  };

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      // Ctrl+Z for undo, Ctrl+Shift+Z for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      }
      // Ctrl+Y for redo
      if ((e.ctrlKey || e.metaKey) && e.key === 'y') {
        e.preventDefault();
        redo();
      }
      // Ctrl+S for save
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        handleSaveProject();
      }
      // Ctrl+Shift+S for save as
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.key === 'S') {
        e.preventDefault();
        handleSaveProjectAs();
      }
      // Ctrl+O for open
      if ((e.ctrlKey || e.metaKey) && e.key === 'o') {
        e.preventDefault();
        handleOpenProject();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [historyStep, history]);

  // Auto-save functionality
  useEffect(() => {
    if (!autoSaveEnabled || !hasUnsavedChanges) {
      return;
    }

    // Clear existing timer
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // Set new auto-save timer
    autoSaveTimerRef.current = setTimeout(async () => {
      // Only auto-save if we have a file handle (project has been saved before)
      const { getCurrentFileHandle } = await import('../utils/ftsFormat');
      if (getCurrentFileHandle() && hasUnsavedChanges) {
        console.log('[AutoSave] Saving project...');
        await handleSaveProject();
        toast({
          title: "Auto-saved",
          description: `Project auto-saved at ${new Date().toLocaleTimeString()}`
        });
      }
    }, AUTO_SAVE_INTERVAL);

    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, [autoSaveEnabled, hasUnsavedChanges, layers, backgroundColor]);

  return (
    <div className="flex flex-col h-screen bg-[#1e1e1e] text-white">
      {/* Hidden file input for opening .fts projects (fallback for unsupported browsers) */}
      <input
        ref={projectFileInputRef}
        type="file"
        accept=".fts"
        className="hidden"
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFileInputChange(e.target.files[0]);
            e.target.value = ''; // Reset so same file can be opened again
          }
        }}
      />

      <MenuBar
        onFileUpload={handleFileUpload}
        onExport={handleExport}
        onUndo={undo}
        onRedo={redo}
        canUndo={historyStep >= 0}
        canRedo={historyStep < history.length - 1}
        onSaveProject={handleSaveProject}
        onSaveProjectAs={handleSaveProjectAs}
        onOpenProject={handleOpenProject}
      />

      <div className="flex flex-1 overflow-hidden">
        <Toolbar
          activeTool={activeTool}
          setActiveTool={setActiveTool}
          brushSize={brushSize}
          setBrushSize={setBrushSize}
          brushOpacity={brushOpacity}
          setBrushOpacity={setBrushOpacity}
          pressureSensitivity={pressureSensitivity}
          setPressureSensitivity={setPressureSensitivity}
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
            brushOpacity={brushOpacity}
            pressureSensitivity={pressureSensitivity}
            color={color}
            zoom={zoom}
            backgroundColor={backgroundColor}
            layers={layers}
            activeLayerId={activeLayerId}
            onHistoryAdd={addToHistory}
            onLayersUpdate={setLayers}
            onColorPick={setColor}
          />

          <div className="flex items-center justify-between px-4 py-2 bg-[#1e1e1e] border-t border-[#3e3e3e]">
            <span className="text-xs text-gray-400">
              Document: {projectName}{hasUnsavedChanges ? ' *' : ''}
              {lastSaveTime && <span className="ml-2 text-gray-500">(Last saved: {lastSaveTime.toLocaleTimeString()})</span>}
            </span>
            <ColorPicker color={color} setColor={setColor} />
          </div>
        </div>

        <div className="w-80 bg-[#262626] border-l border-[#3e3e3e] overflow-y-auto">
          <div className="p-4 border-b border-[#3e3e3e]">
            <PropertiesPanel
              applyFilter={applyFilter}
              activeTool={activeTool}
              layers={layers}
              activeLayerId={activeLayerId}
              onLayersUpdate={handleLayerUpdate}
            />
          </div>

          <div className="p-4 border-b border-[#3e3e3e]">
            <LayersPanel
              layers={layers}
              activeLayerId={activeLayerId}
              setActiveLayerId={setActiveLayerId}
              onLayersUpdate={handleLayerUpdate}
              onLayerAdd={handleLayerAdd}
              backgroundColor={backgroundColor}
              onBackgroundColorChange={handleBackgroundColorChange}
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