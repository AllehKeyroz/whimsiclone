import React, { useRef, useEffect } from 'react';
import { CanvasNode, NodeType, ShapeType } from '../types';

interface NodeProps {
  node: CanvasNode;
  isSelected: boolean;
  isConnecting: boolean;
  isConnectionSource: boolean;
  onSelect: (e: React.MouseEvent) => void;
  onChange: (id: string, updates: Partial<CanvasNode>) => void;
  onStartConnect?: (e: React.MouseEvent, nodeId: string) => void;
  scale: number;
}

const Node: React.FC<NodeProps> = ({ node, isSelected, isConnecting, isConnectionSource, onSelect, onChange, onStartConnect, scale }) => {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nodeRef = useRef<HTMLDivElement>(null);

  // Resizing Logic
  const handleResizeStart = (e: React.MouseEvent, direction: string) => {
    e.stopPropagation();
    e.preventDefault();

    const startX = e.clientX;
    const startY = e.clientY;
    const startWidth = node.width;
    const startHeight = node.height;
    const startLeft = node.x;
    const startTop = node.y;

    const handleMouseMove = (moveEvent: MouseEvent) => {
      const deltaX = (moveEvent.clientX - startX) / scale;
      const deltaY = (moveEvent.clientY - startY) / scale;

      let newWidth = startWidth;
      let newHeight = startHeight;
      let newX = startLeft;
      let newY = startTop;

      if (direction.includes('e')) newWidth = Math.max(50, startWidth + deltaX);
      if (direction.includes('s')) newHeight = Math.max(50, startHeight + deltaY);
      if (direction.includes('w')) {
        const w = Math.max(50, startWidth - deltaX);
        newWidth = w;
        newX = startLeft + (startWidth - w);
      }
      if (direction.includes('n')) {
        const h = Math.max(50, startHeight - deltaY);
        newHeight = h;
        newY = startTop + (startHeight - h);
      }

      onChange(node.id, { x: newX, y: newY, width: newWidth, height: newHeight });
    };

    const handleMouseUp = () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

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
  if (isSelected) selectionStyles = "ring-2 ring-purple-500 ring-offset-2 z-20 shadow-xl";
  else if (isConnecting) selectionStyles = "hover:ring-4 hover:ring-purple-300 ring-offset-0 z-30 cursor-crosshair";
  else selectionStyles = "hover:shadow-md z-10";

  if (isConnectionSource) selectionStyles += " ring-4 ring-purple-400 z-40";
  
  let shapeClasses = "";
  let textClasses = "text-center w-full h-full bg-transparent resize-none outline-none overflow-hidden font-medium text-gray-800 placeholder-gray-400/50";

  // Add pointer-events-auto to ensure clicks reach the textarea when not dragging
  // But wait, if we want to drag by clicking ANYWHERE on the node, the textarea might block it?
  // No, if we click textarea, it focuses. To drag, we usually click the "body".
  // Whimsical behavior: Clicking text focuses it immediately if it's already selected?
  // Or: Single click selects node. Double click edits text.
  // The user says "text not working".
  // Currently: onMouseDown stops propagation. So clicking textarea focuses it.
  // BUT: if `pointer-events-none` is applied via some class? No.
  
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

  const ResizeHandle = ({ cursor, direction, className }: { cursor: string, direction: string, className: string }) => (
    <div
      className={`absolute w-3 h-3 bg-white border border-purple-500 rounded-full z-50 ${className}`}
      style={{ cursor }}
      onMouseDown={(e) => handleResizeStart(e, direction)}
    />
  );

  return (
    <div
      ref={nodeRef}
      className={`${baseStyles} ${selectionStyles} ${shapeClasses} group`}
      style={{
        left: node.x,
        top: node.y,
        width: node.width,
        height: node.height,
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
          onMouseDown={(e) => {
             // Stop propagation to prevent canvas drag/selection.
             // But we only want to stop if we are NOT connecting.
             if (!isConnecting) {
                 e.stopPropagation();
             }
          }}
          onKeyDown={(e) => e.stopPropagation()} // Stop delete/backspace from deleting the node while typing
        />
      </div>

      {isSelected && !isConnecting && (
        <>
            <ResizeHandle cursor="nw-resize" direction="nw" className="-top-1.5 -left-1.5" />
            <ResizeHandle cursor="n-resize" direction="n" className="-top-1.5 left-1/2 -translate-x-1/2" />
            <ResizeHandle cursor="ne-resize" direction="ne" className="-top-1.5 -right-1.5" />
            <ResizeHandle cursor="w-resize" direction="w" className="top-1/2 -left-1.5 -translate-y-1/2" />
            <ResizeHandle cursor="e-resize" direction="e" className="top-1/2 -right-1.5 -translate-y-1/2" />
            <ResizeHandle cursor="sw-resize" direction="sw" className="-bottom-1.5 -left-1.5" />
            <ResizeHandle cursor="s-resize" direction="s" className="-bottom-1.5 left-1/2 -translate-x-1/2" />
            <ResizeHandle cursor="se-resize" direction="se" className="-bottom-1.5 -right-1.5" />
        </>
      )}

      {/* Connection Anchors (Visible on Hover or Selection) */}
      {!isConnecting && (
          <>
            {/* Top */}
            <div
                className="absolute -top-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-purple-500 opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-crosshair z-50 flex items-center justify-center shadow-sm text-white peer/top"
                onMouseDown={(e) => onStartConnect && onStartConnect(e, node.id)}
            >
                <div className="w-1.5 h-1.5 bg-white rounded-full pointer-events-none" />
            </div>
            {/* Ghost Clone Preview Top */}
            <div className="absolute -top-[50px] left-1/2 -translate-x-1/2 w-full h-full opacity-0 peer-hover/top:opacity-30 pointer-events-none transition-opacity bg-current rounded-lg border border-dashed border-gray-400" />


             {/* Bottom */}
             <div
                className="absolute -bottom-3 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full bg-purple-500 opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-crosshair z-50 flex items-center justify-center shadow-sm peer/bottom"
                onMouseDown={(e) => onStartConnect && onStartConnect(e, node.id)}
            >
                <div className="w-1.5 h-1.5 bg-white rounded-full pointer-events-none" />
            </div>
            {/* Ghost Clone Preview Bottom */}
            <div className="absolute -bottom-[50px] left-1/2 -translate-x-1/2 w-full h-full opacity-0 peer-hover/bottom:opacity-30 pointer-events-none transition-opacity bg-current rounded-lg border border-dashed border-gray-400" />


             {/* Left */}
             <div
                className="absolute top-1/2 -translate-y-1/2 -left-3 w-4 h-4 rounded-full bg-purple-500 opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-crosshair z-50 flex items-center justify-center shadow-sm peer/left"
                onMouseDown={(e) => onStartConnect && onStartConnect(e, node.id)}
            >
                <div className="w-1.5 h-1.5 bg-white rounded-full pointer-events-none" />
            </div>
            {/* Ghost Clone Preview Left */}
            <div className="absolute top-1/2 -translate-y-1/2 -left-[50px] -translate-x-full w-full h-full opacity-0 peer-hover/left:opacity-30 pointer-events-none transition-opacity bg-current rounded-lg border border-dashed border-gray-400" />

             {/* Right */}
             <div
                className="absolute top-1/2 -translate-y-1/2 -right-3 w-4 h-4 rounded-full bg-purple-500 opacity-0 group-hover:opacity-100 hover:scale-125 transition-all cursor-crosshair z-50 flex items-center justify-center shadow-sm peer/right"
                onMouseDown={(e) => onStartConnect && onStartConnect(e, node.id)}
            >
                 <div className="w-1.5 h-1.5 bg-white rounded-full pointer-events-none" />
            </div>
            {/* Ghost Clone Preview Right */}
            <div className="absolute top-1/2 -translate-y-1/2 -right-[50px] translate-x-full w-full h-full opacity-0 peer-hover/right:opacity-30 pointer-events-none transition-opacity bg-current rounded-lg border border-dashed border-gray-400" />
          </>
      )}
    </div>
  );
};

export default Node;