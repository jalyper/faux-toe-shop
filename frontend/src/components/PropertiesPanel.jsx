import React, { useState, useEffect } from 'react';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

const PropertiesPanel = ({ applyFilter, activeTool, layers, activeLayerId, onLayersUpdate }) => {
  const activeLayer = layers.find(l => l.id === activeLayerId);
  const [brightness, setBrightness] = useState(activeLayer?.adjustments?.brightness || 0);
  const [contrast, setContrast] = useState(activeLayer?.adjustments?.contrast || 0);
  const [saturation, setSaturation] = useState(activeLayer?.adjustments?.saturation || 0);
  const [blur, setBlur] = useState(activeLayer?.adjustments?.blur || 0);

  // Update local state when active layer changes
  useEffect(() => {
    if (activeLayer?.adjustments) {
      setBrightness(activeLayer.adjustments.brightness);
      setContrast(activeLayer.adjustments.contrast);
      setSaturation(activeLayer.adjustments.saturation);
      setBlur(activeLayer.adjustments.blur);
    }
  }, [activeLayerId, activeLayer]);

  const handleApplyFilter = (filterType, value) => {
    // Update layer's adjustment values
    if (activeLayer) {
      const updatedLayers = layers.map(layer => {
        if (layer.id === activeLayerId) {
          return {
            ...layer,
            adjustments: {
              ...layer.adjustments,
              [filterType]: value
            }
          };
        }
        return layer;
      });
      onLayersUpdate(updatedLayers);
    }
    
    applyFilter(filterType, value);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-semibold">Adjustments</h3>
        {activeLayer && (
          <p className="text-xs text-gray-400 mt-1">
            For: <span className="text-blue-400">{activeLayer.name}</span>
          </p>
        )}
      </div>
      
      <Separator className="bg-[#3e3e3e]" />
      
      <div className="space-y-4">
        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs">Brightness</Label>
            <span className="text-xs text-gray-400">{brightness}</span>
          </div>
          <Slider
            value={[brightness]}
            onValueChange={([value]) => setBrightness(value)}
            onValueCommit={([value]) => handleApplyFilter('brightness', value)}
            min={-100}
            max={100}
            step={1}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs">Contrast</Label>
            <span className="text-xs text-gray-400">{contrast}</span>
          </div>
          <Slider
            value={[contrast]}
            onValueChange={([value]) => setContrast(value)}
            onValueCommit={([value]) => handleApplyFilter('contrast', value)}
            min={-100}
            max={100}
            step={1}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs">Saturation</Label>
            <span className="text-xs text-gray-400">{saturation}</span>
          </div>
          <Slider
            value={[saturation]}
            onValueChange={([value]) => setSaturation(value)}
            onValueCommit={([value]) => handleApplyFilter('saturation', value)}
            min={-100}
            max={100}
            step={1}
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <Label className="text-xs">Blur</Label>
            <span className="text-xs text-gray-400">{blur}</span>
          </div>
          <Slider
            value={[blur]}
            onValueChange={([value]) => setBlur(value)}
            onValueCommit={([value]) => handleApplyFilter('blur', value)}
            min={0}
            max={100}
            step={1}
          />
        </div>
      </div>

      <Separator className="bg-[#3e3e3e]" />

      <div className="space-y-2">
        <Label className="text-xs font-semibold">Quick Filters</Label>
        <div className="grid grid-cols-2 gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleApplyFilter('grayscale', 100)}
            className="bg-[#3e3e3e] border-[#4e4e4e] hover:bg-[#4e4e4e] text-xs"
          >
            Grayscale
          </Button>
          <Button
            variant="outline"
            size="sm"
            onClick={() => handleApplyFilter('sepia', 100)}
            className="bg-[#3e3e3e] border-[#4e4e4e] hover:bg-[#4e4e4e] text-xs"
          >
            Sepia
          </Button>
        </div>
      </div>
    </div>
  );
};

export default PropertiesPanel;