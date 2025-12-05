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

const LayersPanel = ({ layers, activeLayerId, setActiveLayerId, onLayersUpdate, onLayerAdd }) => {
  const [normalizeDialogOpen, setNormalizeDialogOpen] = useState(false);
  const [layerToNormalize, setLayerToNormalize] = useState(null);
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
          layers.map(layer => (
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
                <span 
                  className="text-sm font-medium" 
                  data-testid={`layer-name-${layer.id}`}
                >
                  {layer.name}
                </span>
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
    </div>
  );
};

export default LayersPanel;