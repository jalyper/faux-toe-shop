import React from 'react';
import { Undo, Redo, Clock } from 'lucide-react';
import { Button } from './ui/button';
import { Separator } from './ui/separator';
import { ScrollArea } from './ui/scroll-area';

const HistoryPanel = ({ history, historyStep, onUndo, onRedo }) => {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-sm font-semibold flex items-center gap-2">
          <Clock size={16} />
          History
        </h3>
        <div className="flex gap-1">
          <Button
            size="sm"
            variant="ghost"
            onClick={onUndo}
            disabled={historyStep <= 0}
            className="h-8 w-8 p-0 hover:bg-[#3e3e3e]"
            title="Undo"
          >
            <Undo size={14} />
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onRedo}
            disabled={historyStep >= history.length - 1}
            className="h-8 w-8 p-0 hover:bg-[#3e3e3e]"
            title="Redo"
          >
            <Redo size={14} />
          </Button>
        </div>
      </div>
      
      <Separator className="bg-[#3e3e3e]" />
      
      <ScrollArea className="h-48">
        <div className="space-y-1">
          {history.length === 0 ? (
            <div className="text-center text-sm text-gray-400 py-8">
              No history yet
            </div>
          ) : (
            history.map((item, index) => (
              <div
                key={item.id}
                className={`px-3 py-2 rounded text-sm transition-colors ${
                  index === historyStep
                    ? 'bg-[#0d7bdc] text-white'
                    : index < historyStep
                    ? 'bg-[#3e3e3e] text-gray-300'
                    : 'bg-[#2d2d2d] text-gray-500'
                }`}
              >
                <div className="font-medium">{item.action}</div>
                <div className="text-xs opacity-70">{item.timestamp}</div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
};

export default HistoryPanel;