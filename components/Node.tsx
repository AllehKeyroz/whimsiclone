import React, { useRef, useEffect } from 'react';
import { CanvasNode, NodeType, ShapeType } from '../types';

interface NodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isConnecting: boolean;
  isConnectionSource: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onChange: (id: string, updates: Partial<CanvasNode>) => void;
  scale: number;
}

const Node: React.FC<NodeProps> = ({ node, isSelected, isConnecting, isConnectionSource, onSelect, onChange, scale }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Sync actual height back to parent using ResizeObserver to avoid render loops
  useEffect(() => {
    if (!nodeRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const newHeight = entry.contentRect.height;
        // Only update if change is significant to prevent jitter
        if (Math.abs(newHeight - node.height) > 1) {
          onChange(node.id, { height: newHeight });
        }
      }
    });

    observer.observe(nodeRef.current);
    return () => observer.disconnect();
  }, [node.id, onChange, node.height]);

  // Auto-resize textarea height internally
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = textareaRef.current.scrollHeight + 'px';
    }
  }, [node.text]);

  const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(node.id, { text: e.target.value });
  };

  const getBaseMinHeight = () => {
    switch (node.type) {
      case NodeType.STICKY: return 120;
      case NodeType.SHAPE: return 60;
      case NodeType.TEXT: return 30;
      default: return 80;
    }
  };

  const baseMinHeight = getBaseMinHeight();

  // Styles logic
  const baseStyles = "absolute flex items-center justify-center transition-all duration-200 cursor-grab active:cursor-grabbing origin-center";
  
  let selectionStyles = "";
  if (isSelected) selectionStyles = "ring-2 ring-purple-500 ring-offset-2 z-20 shadow-xl scale-[1.02]";
  else if (isConnecting) selectionStyles = "hover:ring-4 hover:ring-purple-300 ring-offset-0 z-30 cursor-crosshair";
  else selectionStyles = "hover:shadow-md z-10";

  if (isConnectionSource) selectionStyles += " ring-4 ring-purple-400 z-40";
  
  let shapeClasses = "";
  let textClasses = "text-center w-full bg-transparent resize-none outline-none overflow-hidden font-medium text-gray-800 placeholder-gray-400/50";
  
  if (node.type === NodeType.STICKY) {
    shapeClasses = `${node.color} shadow-sm`;
    textClasses += " font-handwriting text-lg leading-tight p-4"; 
  } else if (node.type === NodeType.SHAPE) {
     shapeClasses = `${node.color} border-2`;
     if (node.shapeType === ShapeType.CIRCLE) shapeClasses += " rounded-full";
     else if (node.shapeType === ShapeType.PILL) shapeClasses += " rounded-full px-6";
     else if (node.shapeType === ShapeType.DIAMOND) shapeClasses += " rotate-45"; 
     else shapeClasses += " rounded-lg"; 
  } else if (node.type === NodeType.TEXT) {
    shapeClasses = "bg-transparent";
    textClasses += " text-left text-xl font-bold p-2";
  }

  const innerStyle: React.CSSProperties = node.shapeType === ShapeType.DIAMOND 
    ? { transform: 'rotate(-45deg)' } 
    : {};

  return (
    <div
      ref={nodeRef}
      className={`${baseStyles} ${selectionStyles} ${shapeClasses}`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        minHeight: baseMinHeight,
      }}
      onMouseDown={onSelect}
    >
      <div style={{...innerStyle, width: '100%', height: '100%', display:'flex', alignItems:'center', justifyContent:'center'}}>
        <textarea
          ref={textareaRef}
          value={node.text}
          onChange={handleTextChange}
          placeholder={node.type === NodeType.TEXT ? "Start typing..." : ""}
          className={`${textClasses} ${isConnecting ? 'pointer-events-none' : ''}`}
          style={{ cursor: isConnecting ? 'crosshair' : 'text' }}
          spellCheck={false}
          onMouseDown={(e) => !isConnecting && e.stopPropagation()} 
        />
      </div>
    </div>
  );
};

export default Node;