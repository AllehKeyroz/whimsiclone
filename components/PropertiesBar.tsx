import React from 'react';
import { Trash2, Sparkles, Palette } from 'lucide-react';
import { NodeColor } from '../types';

interface PropertiesBarProps {
  onDelete: () => void;
  onColorChange: (color: NodeColor) => void;
  onGenerateAI: () => void;
  x: number;
  y: number;
  zoom: number; // Viewport zoom to scale the bar properly if needed, usually fixed overlay is better
}

const PropertiesBar: React.FC<PropertiesBarProps> = ({ onDelete, onColorChange, onGenerateAI, x, y }) => {
  const colors = [
    { label: 'Yellow', value: NodeColor.YELLOW, bg: 'bg-yellow-200' },
    { label: 'Pink', value: NodeColor.PINK, bg: 'bg-pink-200' },
    { label: 'Blue', value: NodeColor.BLUE, bg: 'bg-blue-200' },
    { label: 'Purple', value: NodeColor.PURPLE, bg: 'bg-purple-200' },
    { label: 'Green', value: NodeColor.GREEN, bg: 'bg-green-200' },
    { label: 'White', value: NodeColor.WHITE, bg: 'bg-gray-100' },
  ];

  // Position relative to screen
  const style: React.CSSProperties = {
    position: 'absolute',
    left: x,
    top: y - 60, // Position above the node
    transform: 'translateX(-50%)',
    zIndex: 100,
  };

  return (
    <div style={style} className="bg-white rounded-lg shadow-[0_4px_20px_rgba(0,0,0,0.15)] border border-gray-100 p-1.5 flex items-center gap-2 animate-in fade-in zoom-in duration-200">
      
      {/* AI Trigger */}
      <button 
        onClick={onGenerateAI}
        className="flex items-center gap-1.5 px-2 py-1.5 hover:bg-purple-50 text-purple-600 rounded text-sm font-medium transition-colors"
      >
        <Sparkles size={14} />
        <span>Expand</span>
      </button>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      {/* Colors */}
      <div className="flex items-center gap-1">
        {colors.map((c) => (
          <button
            key={c.value}
            onClick={() => onColorChange(c.value)}
            className={`w-5 h-5 rounded-full ${c.bg} hover:ring-2 ring-gray-300 ring-offset-1 transition-all`}
            title={c.label}
          />
        ))}
      </div>

      <div className="w-px h-5 bg-gray-200 mx-1" />

      <button
        onClick={onDelete}
        className="p-1.5 text-gray-500 hover:text-red-500 hover:bg-red-50 rounded transition-colors"
        title="Delete"
      >
        <Trash2 size={16} />
      </button>
    </div>
  );
};

export default PropertiesBar;
