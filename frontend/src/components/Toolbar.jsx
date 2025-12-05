import React from 'react';
import { MousePointer, Brush, Pencil, Eraser, Type, Square, Circle, Move } from 'lucide-react';
import { Separator } from './ui/separator';
import { Slider } from './ui/slider';
import { Label } from './ui/label';

const Toolbar = ({ activeTool, setActiveTool, brushSize, setBrushSize }) => {
  const tools = [
    { id: 'select', icon: MousePointer, label: 'Select' },
    { id: 'move', icon: Move, label: 'Move' },
    { id: 'brush', icon: Brush, label: 'Brush' },
    { id: 'pencil', icon: Pencil, label: 'Pencil' },
    { id: 'eraser', icon: Eraser, label: 'Eraser' },
    { id: 'text', icon: Type, label: 'Text' },
    { id: 'rectangle', icon: Square, label: 'Rectangle' },
    { id: 'circle', icon: Circle, label: 'Circle' },
  ];

  return (
    <div className="w-16 bg-[#262626] border-r border-[#3e3e3e] flex flex-col items-center py-4 gap-2">
      {tools.map((tool, index) => (
        <React.Fragment key={tool.id}>
          <button
            onClick={() => setActiveTool(tool.id)}
            className={`w-12 h-12 flex items-center justify-center rounded transition-colors ${
              activeTool === tool.id
                ? 'bg-[#0d7bdc] text-white'
                : 'hover:bg-[#3e3e3e] text-gray-300'
            }`}
            title={tool.label}
          >
            <tool.icon size={20} />
          </button>
          {index === 1 && <Separator className="w-10 bg-[#3e3e3e]" />}
          {index === 4 && <Separator className="w-10 bg-[#3e3e3e]" />}
        </React.Fragment>
      ))}
      
      {(activeTool === 'brush' || activeTool === 'pencil' || activeTool === 'eraser') && (
        <div className="mt-4 px-2 w-full">
          <Label className="text-xs text-gray-400">Size</Label>
          <Slider
            value={[brushSize]}
            onValueChange={([value]) => setBrushSize(value)}
            min={1}
            max={50}
            step={1}
            className="mt-2"
          />
          <span className="text-xs text-gray-400 mt-1 block text-center">{brushSize}px</span>
        </div>
      )}
    </div>
  );
};

export default Toolbar;