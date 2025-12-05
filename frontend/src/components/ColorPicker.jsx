import React, { useState } from 'react';
import { SketchPicker } from 'react-color';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Droplet } from 'lucide-react';

const ColorPicker = ({ color, setColor }) => {
  const [localColor, setLocalColor] = useState(color);

  const handleColorChange = (newColor) => {
    const hexColor = newColor.hex;
    setLocalColor(hexColor);
    setColor(hexColor);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button 
          className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[#3e3e3e] transition-colors"
          data-testid="main-color-picker-button"
        >
          <div
            className="w-6 h-6 rounded border-2 border-white flex items-center justify-center"
            style={{ backgroundColor: color }}
          >
            <Droplet size={14} className="text-white mix-blend-difference" />
          </div>
          <span className="text-xs">Color</span>
        </button>
      </PopoverTrigger>
      <PopoverContent 
        className="w-auto p-0 bg-transparent border-0"
        data-testid="color-picker-popover"
      >
        <SketchPicker
          color={localColor}
          onChange={handleColorChange}
          disableAlpha={false}
          presetColors={[
            '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
            '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
            '#FFC0CB', '#A52A2A', '#808080', '#008000', '#000080'
          ]}
        />
      </PopoverContent>
    </Popover>
  );
};

export default ColorPicker;