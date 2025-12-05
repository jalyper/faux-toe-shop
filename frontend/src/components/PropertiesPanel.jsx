import React, { useState } from 'react';
import { Slider } from './ui/slider';
import { Label } from './ui/label';
import { Button } from './ui/button';
import { Separator } from './ui/separator';

const PropertiesPanel = ({ applyFilter, activeTool }) => {
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const [blur, setBlur] = useState(0);

  const handleApplyFilter = (filterType, value) => {
    applyFilter(filterType, value);
  };

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Adjustments</h3>
      
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