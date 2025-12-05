import React, { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from './ui/popover';
import { Label } from './ui/label';
import { Input } from './ui/input';

const ColorPicker = ({ color, setColor }) => {
  const [localColor, setLocalColor] = useState(color);

  const presetColors = [
    '#000000', '#FFFFFF', '#FF0000', '#00FF00', '#0000FF',
    '#FFFF00', '#FF00FF', '#00FFFF', '#FFA500', '#800080',
    '#FFC0CB', '#A52A2A', '#808080', '#008000', '#000080'
  ];

  const handleColorChange = (newColor) => {
    setLocalColor(newColor);
    setColor(newColor);
  };

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button className="flex items-center gap-2 px-3 py-1.5 rounded hover:bg-[#3e3e3e] transition-colors">
          <div
            className="w-6 h-6 rounded border-2 border-white"
            style={{ backgroundColor: color }}
          />
          <span className="text-xs">Color</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 bg-[#262626] border-[#3e3e3e]">
        <div className="space-y-4">
          <div>
            <Label className="text-xs mb-2 block">Current Color</Label>
            <div className="flex items-center gap-2">
              <Input
                type="color"
                value={localColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="w-16 h-10 p-1 cursor-pointer bg-[#3e3e3e] border-[#4e4e4e]"
              />
              <Input
                type="text"
                value={localColor}
                onChange={(e) => handleColorChange(e.target.value)}
                className="flex-1 bg-[#3e3e3e] border-[#4e4e4e] text-white"
              />
            </div>
          </div>

          <div>
            <Label className="text-xs mb-2 block">Preset Colors</Label>
            <div className="grid grid-cols-5 gap-2">
              {presetColors.map((presetColor) => (
                <button
                  key={presetColor}
                  onClick={() => handleColorChange(presetColor)}
                  className={`w-10 h-10 rounded border-2 transition-transform hover:scale-110 ${
                    color === presetColor ? 'border-blue-500' : 'border-gray-600'
                  }`}
                  style={{ backgroundColor: presetColor }}
                  title={presetColor}
                />
              ))}
            </div>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  );
};

export default ColorPicker;