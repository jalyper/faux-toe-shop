import React, { useRef } from 'react';
import { File, Edit, Image as ImageIcon, Layers, Filter, Undo, Redo } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import logo from '../assets/faux-toe-shop-logo.png';

const MenuBar = ({ onFileUpload, onExport, onUndo, onRedo, canUndo, canRedo }) => {
  const fileInputRef = useRef(null);

  const handleFileSelect = (e) => {
    const file = e.target.files[0];
    if (file && file.type.startsWith('image/')) {
      onFileUpload(file);
    }
  };

  return (
    <div className="h-12 bg-[#1e1e1e] border-b border-[#3e3e3e] flex items-center px-4 gap-4">
      <img
        src={logo}
        alt="Faux Toe Shop logo"
        className="h-24 w-auto object-contain select-none"
      />
      
      <div className="flex items-center gap-1">
        <DropdownMenu>
          <DropdownMenuTrigger className="px-3 py-1.5 text-sm hover:bg-[#3e3e3e] rounded transition-colors">
            File
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#262626] border-[#3e3e3e]">
            <DropdownMenuItem onClick={() => fileInputRef.current?.click()}>
              <File className="mr-2 h-4 w-4" />
              <span>Open Image</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator className="bg-[#3e3e3e]" />
            <DropdownMenuItem onClick={() => onExport('png')}>
              Export as PNG
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => onExport('jpeg')}>
              Export as JPEG
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="px-3 py-1.5 text-sm hover:bg-[#3e3e3e] rounded transition-colors">
            Edit
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#262626] border-[#3e3e3e]">
            <DropdownMenuItem onClick={onUndo} disabled={!canUndo}>
              <Undo className="mr-2 h-4 w-4" />
              <span>Undo</span>
              <span className="ml-auto text-xs text-gray-400">Ctrl+Z</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onRedo} disabled={!canRedo}>
              <Redo className="mr-2 h-4 w-4" />
              <span>Redo</span>
              <span className="ml-auto text-xs text-gray-400">Ctrl+Shift+Z</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="px-3 py-1.5 text-sm hover:bg-[#3e3e3e] rounded transition-colors">
            Image
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#262626] border-[#3e3e3e]">
            <DropdownMenuItem>
              <ImageIcon className="mr-2 h-4 w-4" />
              <span>Image Size</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ImageIcon className="mr-2 h-4 w-4" />
              <span>Canvas Size</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="px-3 py-1.5 text-sm hover:bg-[#3e3e3e] rounded transition-colors">
            Layer
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#262626] border-[#3e3e3e]">
            <DropdownMenuItem>
              <Layers className="mr-2 h-4 w-4" />
              <span>New Layer</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Layers className="mr-2 h-4 w-4" />
              <span>Duplicate Layer</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
          <DropdownMenuTrigger className="px-3 py-1.5 text-sm hover:bg-[#3e3e3e] rounded transition-colors">
            Filter
          </DropdownMenuTrigger>
          <DropdownMenuContent className="bg-[#262626] border-[#3e3e3e]">
            <DropdownMenuItem>
              <Filter className="mr-2 h-4 w-4" />
              <span>Blur</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Filter className="mr-2 h-4 w-4" />
              <span>Sharpen</span>
            </DropdownMenuItem>
            <DropdownMenuItem>
              <Filter className="mr-2 h-4 w-4" />
              <span>Grayscale</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
      />
    </div>
  );
};

export default MenuBar;
