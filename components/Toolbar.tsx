import React from 'react';
import { MousePointer2, Hand, StickyNote, Square, Type, GitMerge } from 'lucide-react';
import { ToolType } from '../types';

interface ToolbarProps {
  activeTool: ToolType;
  onSelectTool: (tool: ToolType) => void;
}

const Toolbar: React.FC<ToolbarProps> = ({ activeTool, onSelectTool }) => {
  const tools = [
    { type: ToolType.SELECT, icon: <MousePointer2 size={20} />, label: 'Move (V)' },
    { type: ToolType.PAN, icon: <Hand size={20} />, label: 'Pan (H)' },
    { type: ToolType.STICKY, icon: <StickyNote size={20} />, label: 'Sticky (S)' },
    { type: ToolType.SHAPE, icon: <Square size={20} />, label: 'Shape (R)' },
    { type: ToolType.TEXT, icon: <Type size={20} />, label: 'Text (T)' },
    { type: ToolType.CONNECTOR, icon: <GitMerge size={20} />, label: 'Connect (C)' },
  ];

  return (
    <div className="fixed left-4 top-1/2 -translate-y-1/2 bg-white rounded-lg shadow-[0_2px_12px_rgba(0,0,0,0.08)] border border-gray-100 p-2 flex flex-col gap-2 z-50">
      {tools.map((tool) => (
        <button
          key={tool.type}
          onClick={() => onSelectTool(tool.type)}
          className={`p-2.5 rounded-md transition-all duration-200 group relative flex items-center justify-center
            ${activeTool === tool.type 
              ? 'bg-purple-100 text-purple-700' 
              : 'text-gray-500 hover:bg-gray-50 hover:text-gray-900'
            }`}
          title={tool.label}
        >
          {tool.icon}
          {/* Tooltip */}
          <span className="absolute left-full ml-3 px-2 py-1 bg-gray-800 text-white text-xs rounded opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 transition-opacity">
            {tool.label}
          </span>
        </button>
      ))}
    </div>
  );
};

export default Toolbar;
