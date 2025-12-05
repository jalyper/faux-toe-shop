import React, { useState } from 'react';
import { Eye, EyeOff, Lock, Unlock, Plus, Trash2 } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from './ui/alert-dialog';

const LayersPanel = ({ layers, activeLayerId, setActiveLayerId, onLayersUpdate, onLayerAdd, backgroundColor, onBackgroundColorChange }) => {
  const [normalizeDialogOpen, setNormalizeDialogOpen] = useState(false);
  const [layerToNormalize, setLayerToNormalize] = useState(null);
  const [colorPickerOpen, setColorPickerOpen] = useState(false);
  const [tempBackgroundColor, setTempBackgroundColor] = useState(backgroundColor || '#ffffff');
  const toggleLayerVisibility = (layerId) => {
    const updatedLayers = layers.map(layer =>
      layer.id === layerId ? { ...layer, visible: !layer.visible } : layer
    );
    onLayersUpdate(updatedLayers);
  };

  const toggleLayerLock = (layerId) => {
    const updatedLayers = layers.map(layer =>
      layer.id === layerId ? { ...layer, locked: !layer.locked } : layer
    );
    onLayersUpdate(updatedLayers);
  };

  const updateLayerOpacity = (layerId, opacity) => {
    const updatedLayers = layers.map(layer =>
      layer.id === layerId ? { ...layer, opacity } : layer
    );
    onLayersUpdate(updatedLayers);
  };

  const deleteLayer = (layerId) => {
    // Prevent deletion of background layer
    const layer = layers.find(l => l.id === layerId);
    if (layer?.isBackground) {
      return;
    }
    const updatedLayers = layers.filter(layer => layer.id !== layerId);
    onLayersUpdate(updatedLayers);
  };

  const handleLayerDoubleClick = (layer) => {
    // Only show normalize dialog for background layer
    if (layer.isBackground) {
      setLayerToNormalize(layer);
      setNormalizeDialogOpen(true);
    }
  };

  const normalizeLayer = () => {
    if (layerToNormalize) {
      const updatedLayers = layers.map(layer =>
        layer.id === layerToNormalize.id
          ? { ...layer, name: 'Layer 0', isBackground: false }
          : layer
      );
      onLayersUpdate(updatedLayers);
      setNormalizeDialogOpen(false);
      setLayerToNormalize(null);
    }
  };

  const [originalBackgroundColor, setOriginalBackgroundColor] = useState(null);

  const handleColorSwatchClick = (e, layer) => {
    if (layer.isBackground) {
      e.stopPropagation();
      const currentColor = backgroundColor || '#ffffff';
      setOriginalBackgroundColor(currentColor); // Store original for cancel
      setTempBackgroundColor(currentColor);
      setColorPickerOpen(true);
    }
  };

  const handleColorChange = (newColor) => {
    setTempBackgroundColor(newColor);
    // Update in real-time
    if (onBackgroundColorChange) {
      onBackgroundColorChange(newColor);
    }
  };

  const handleColorPickerOk = () => {
    setColorPickerOpen(false);
  };

  const handleColorPickerCancel = () => {
    // Revert to original color
    if (onBackgroundColorChange) {
      onBackgroundColorChange(backgroundColor);
    }
    setColorPickerOpen(false);
  };

  return (
    <div className="space-y-4" data-testid="layers-panel">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold">Layers</h3>
        <Button
          size="sm"
          variant="ghost"
          onClick={() => onLayerAdd('image')}
          className="h-8 w-8 p-0 hover:bg-[#3e3e3e]"
          data-testid="add-layer-button"
          aria-label="Add new layer"
        >
          <Plus size={16} />
        </Button>
      </div>
      
      <Separator className="bg-[#3e3e3e]" />
      
      <div className="space-y-2 max-h-64 overflow-y-auto" data-testid="layers-list">
        {layers.length === 0 ? (
          <div className="text-center text-sm text-gray-400 py-8" data-testid="no-layers-message">
            No layers yet
          </div>
        ) : (
          [...layers].reverse().map(layer => (
            <div
              key={layer.id}
              data-testid={`layer-${layer.id}`}
              className={`p-3 rounded cursor-pointer transition-colors ${
                activeLayerId === layer.id
                  ? 'bg-[#0d7bdc]'
                  : 'bg-[#3e3e3e] hover:bg-[#4e4e4e]'
              }`}
              onClick={() => setActiveLayerId(layer.id)}
              onDoubleClick={() => handleLayerDoubleClick(layer)}
            >
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  {layer.isBackground && (
                    <button
                      onClick={(e) => handleColorSwatchClick(e, layer)}
                      className="w-5 h-5 rounded border-2 border-white hover:border-blue-400 transition-colors"
                      style={{ backgroundColor: backgroundColor || '#ffffff' }}
                      data-testid="background-color-swatch"
                      title="Change background color"
                    />
                  )}
                  <span 
                    className="text-sm font-medium" 
                    data-testid={`layer-name-${layer.id}`}
                  >
                    {layer.name}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerVisibility(layer.id);
                    }}
                    className="hover:text-blue-400 transition-colors"
                    data-testid={`layer-visibility-${layer.id}`}
                    aria-label={`Toggle visibility for ${layer.name}`}
                  >
                    {layer.visible ? <Eye size={14} /> : <EyeOff size={14} />}
                  </button>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleLayerLock(layer.id);
                    }}
                    className="hover:text-blue-400 transition-colors"
                    data-testid={`layer-lock-${layer.id}`}
                    aria-label={`Toggle lock for ${layer.name}`}
                  >
                    {layer.locked ? <Lock size={14} /> : <Unlock size={14} />}
                  </button>
                  {!layer.isBackground && (
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        deleteLayer(layer.id);
                      }}
                      className="hover:text-red-400 transition-colors"
                      data-testid={`layer-delete-${layer.id}`}
                      aria-label={`Delete ${layer.name}`}
                    >
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              </div>
              
              <div className="space-y-1">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-gray-400">Opacity</span>
                  <span className="text-xs text-gray-400">{layer.opacity}%</span>
                </div>
                <Slider
                  value={[layer.opacity]}
                  onValueChange={([value]) => updateLayerOpacity(layer.id, value)}
                  min={0}
                  max={100}
                  step={1}
                  className="w-full"
                  onClick={(e) => e.stopPropagation()}
                />
              </div>
            </div>
          ))
        )}
      </div>

      {/* Normalize Layer Dialog */}
      <AlertDialog open={normalizeDialogOpen} onOpenChange={setNormalizeDialogOpen}>
        <AlertDialogContent className="bg-[#262626] border-[#3e3e3e] text-white" data-testid="normalize-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Normalize layer?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              This will convert the Background layer to a regular layer named "Layer 0", making it editable and deletable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel 
              className="bg-[#3e3e3e] border-[#4e4e4e] hover:bg-[#4e4e4e] text-white"
              data-testid="normalize-cancel"
            >
              No
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={normalizeLayer}
              className="bg-[#0d7bdc] hover:bg-[#0c6ec7] text-white"
              data-testid="normalize-confirm"
            >
              Yes
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Background Color Picker Dialog */}
      <AlertDialog open={colorPickerOpen} onOpenChange={setColorPickerOpen}>
        <AlertDialogContent className="bg-[#262626] border-[#3e3e3e] text-white" data-testid="background-color-picker-dialog">
          <AlertDialogHeader>
            <AlertDialogTitle>Background Color</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              Select a color for the canvas background
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="py-4">
            <div className="space-y-4">
              <div className="flex items-center gap-4">
                <input
                  type="color"
                  value={tempBackgroundColor}
                  onChange={(e) => handleColorChange(e.target.value)}
                  className="w-20 h-20 cursor-pointer rounded border-2 border-gray-600"
                  data-testid="background-color-input"
                />
                <div className="flex-1">
                  <label className="text-xs text-gray-400 block mb-2">Hex Color</label>
                  <input
                    type="text"
                    value={tempBackgroundColor}
                    onChange={(e) => handleColorChange(e.target.value)}
                    className="w-full px-3 py-2 bg-[#3e3e3e] border border-[#4e4e4e] rounded text-white"
                    placeholder="#ffffff"
                    data-testid="background-color-hex-input"
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 block mb-2">Quick Colors</label>
                <div className="grid grid-cols-8 gap-2">
                  {['#ffffff', '#000000', '#ff0000', '#00ff00', '#0000ff', '#ffff00', '#ff00ff', '#00ffff',
                    '#c0c0c0', '#808080', '#800000', '#008000', '#000080', '#808000', '#800080', '#008080'].map((presetColor) => (
                    <button
                      key={presetColor}
                      onClick={() => handleColorChange(presetColor)}
                      className="w-8 h-8 rounded border-2 hover:scale-110 transition-transform"
                      style={{ 
                        backgroundColor: presetColor,
                        borderColor: tempBackgroundColor === presetColor ? '#0d7bdc' : '#4e4e4e'
                      }}
                      title={presetColor}
                    />
                  ))}
                </div>
              </div>
            </div>
          </div>
          <AlertDialogFooter>
            <AlertDialogCancel 
              onClick={handleColorPickerCancel}
              className="bg-[#3e3e3e] border-[#4e4e4e] hover:bg-[#4e4e4e] text-white"
              data-testid="background-color-cancel"
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction 
              onClick={handleColorPickerOk}
              className="bg-[#0d7bdc] hover:bg-[#0c6ec7] text-white"
              data-testid="background-color-ok"
            >
              OK
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default LayersPanel;