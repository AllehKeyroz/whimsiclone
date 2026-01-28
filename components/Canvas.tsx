
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { CanvasNode, Connector, NodeType, ToolType, Viewport, NodeColor, ShapeType } from '../types';
import Node from './Node';
import Toolbar from './Toolbar';
import PropertiesBar from './PropertiesBar';
import { generateMindMapData } from '../services/geminiService';
import { Loader2 } from 'lucide-react';

const INITIAL_VIEWPORT: Viewport = { x: 0, y: 0, zoom: 1 };

const Canvas: React.FC = () => {
  const [nodes, setNodes] = useState<CanvasNode[]>([]);
  const [connectors, setConnectors] = useState<Connector[]>([]);
  const [viewport, setViewport] = useState<Viewport>(INITIAL_VIEWPORT);
  const [activeTool, setActiveTool] = useState<ToolType>(ToolType.SELECT);
  const [selectedNodeIds, setSelectedNodeIds] = useState<Set<string>>(new Set());
  const [isPanning, setIsPanning] = useState(false);
  const [loadingAI, setLoadingAI] = useState(false);
  
  // Connection state
  const [connectionSourceId, setConnectionSourceId] = useState<string | null>(null);
  const [mouseCanvasPos, setMouseCanvasPos] = useState<{x: number, y: number}>({x: 0, y: 0});

  const containerRef = useRef<HTMLDivElement>(null);
  const dragTargetRef = useRef<'viewport' | 'node' | null>(null);
  const lastMousePos = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Update CSS variables for grid scaling
  useEffect(() => {
    document.documentElement.style.setProperty('--zoom', viewport.zoom.toString());
  }, [viewport.zoom]);

  const generateId = (): string => {
    return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
  };

  const screenToCanvas = (sx: number, sy: number) => {
    return {
      x: (sx - viewport.x) / viewport.zoom,
      y: (sy - viewport.y) / viewport.zoom,
    };
  };

  const createNode = (type: NodeType, x: number, y: number, text: string = ""): CanvasNode => {
    let width = 200;
    let height = 120;
    let color = NodeColor.YELLOW;
    let shapeType = ShapeType.RECTANGLE;

    if (type === NodeType.SHAPE) {
      color = NodeColor.WHITE;
      width = 160;
      height = 90;
    } else if (type === NodeType.TEXT) {
      color = NodeColor.TRANSPARENT;
      width = 300;
      height = 40;
    }

    return {
      id: generateId(),
      type,
      x: x - width / 2,
      y: y - height / 2,
      width,
      height,
      text,
      color,
      shapeType
    };
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    const isCanvasClick = e.target === containerRef.current;
    const { x, y } = screenToCanvas(e.clientX, e.clientY);

    if (activeTool === ToolType.PAN || e.button === 1) {
        dragTargetRef.current = 'viewport';
        setIsPanning(true);
    } else if (isCanvasClick) {
        if (activeTool !== ToolType.SELECT && activeTool !== ToolType.PAN && activeTool !== ToolType.CONNECTOR) {
            const newNode = createNode(activeTool as unknown as NodeType, x, y);
            setNodes(prev => [...prev, newNode]);
            setSelectedNodeIds(new Set([newNode.id]));
            if (!e.shiftKey) setActiveTool(ToolType.SELECT);
        } else {
            setSelectedNodeIds(new Set());
            setConnectionSourceId(null);
        }
    }
    
    lastMousePos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const dx = e.clientX - lastMousePos.current.x;
    const dy = e.clientY - lastMousePos.current.y;
    lastMousePos.current = { x: e.clientX, y: e.clientY };

    const { x, y } = screenToCanvas(e.clientX, e.clientY);
    setMouseCanvasPos({ x, y });

    if (dragTargetRef.current === 'viewport') {
        setViewport(prev => ({ ...prev, x: prev.x + dx, y: prev.y + dy }));
    } else if (dragTargetRef.current === 'node' && selectedNodeIds.size > 0 && activeTool === ToolType.SELECT) {
        const scale = viewport.zoom;
        setNodes(prev => prev.map(node => {
            if (selectedNodeIds.has(node.id)) {
                return { ...node, x: node.x + dx / scale, y: node.y + dy / scale };
            }
            return node;
        }));
    }
  };

  const handleMouseUp = () => {
    dragTargetRef.current = null;
    setIsPanning(false);
  };

  const handleWheel = (e: React.WheelEvent) => {
    if (e.ctrlKey || e.metaKey) {
        e.preventDefault();
        const delta = -e.deltaY * 0.001;
        const newZoom = Math.min(Math.max(0.1, viewport.zoom + delta), 5);
        setViewport(prev => ({ ...prev, zoom: newZoom }));
    } else {
        setViewport(prev => ({ ...prev, x: prev.x - e.deltaX, y: prev.y - e.deltaY }));
    }
  };

  const handleNodeSelect = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    
    if (activeTool === ToolType.CONNECTOR) {
        if (!connectionSourceId) {
            setConnectionSourceId(id);
            setSelectedNodeIds(new Set([id]));
        } else if (connectionSourceId !== id) {
            // Check if connection already exists
            const exists = connectors.some(c => (c.startNodeId === connectionSourceId && c.endNodeId === id));
            if (!exists) {
                setConnectors(prev => [...prev, {
                    id: generateId(),
                    startNodeId: connectionSourceId,
                    endNodeId: id
                }]);
            }
            setConnectionSourceId(null); // Finish
            if (!e.shiftKey) setActiveTool(ToolType.SELECT);
        }
        return;
    }

    if (e.shiftKey) {
        setSelectedNodeIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) next.delete(id);
            else next.add(id);
            return next;
        });
    } else {
        setSelectedNodeIds(new Set([id]));
    }
    dragTargetRef.current = 'node';
  };

  // Fixed: Added useCallback here as it was missing from the React imports
  const updateNode = useCallback((id: string, updates: Partial<CanvasNode>) => {
    setNodes(prev => prev.map(n => n.id === id ? { ...n, ...updates } : n));
  }, []);

  const deleteSelected = () => {
    const toDelete = selectedNodeIds;
    setNodes(prev => prev.filter(n => !toDelete.has(n.id)));
    setConnectors(prev => prev.filter(c => !toDelete.has(c.startNodeId) && !toDelete.has(c.endNodeId)));
    setSelectedNodeIds(new Set());
    setConnectionSourceId(null);
  };

  const handleAIExpand = async () => {
    const selectedId = Array.from(selectedNodeIds)[0];
    const sourceNode = nodes.find(n => n.id === selectedId);
    if (!sourceNode || !sourceNode.text.trim()) return;

    setLoadingAI(true);
    const result = await generateMindMapData(sourceNode.text);
    if (result) {
        const newNodes: CanvasNode[] = [];
        const newConnectors: Connector[] = [];
        const radius = 250;
        const angleStep = (2 * Math.PI) / result.subTopics.length;
        
        result.subTopics.forEach((topic, index) => {
            const angle = index * angleStep;
            const nx = sourceNode.x + (sourceNode.width/2) + Math.cos(angle) * radius;
            const ny = sourceNode.y + (sourceNode.height/2) + Math.sin(angle) * radius;
            const newNode = createNode(NodeType.SHAPE, nx, ny, topic.text);
            newNodes.push(newNode);
            newConnectors.push({ id: generateId(), startNodeId: sourceNode.id, endNodeId: newNode.id });
        });
        setNodes(prev => [...prev, ...newNodes]);
        setConnectors(prev => [...prev, ...newConnectors]);
    }
    setLoadingAI(false);
  };

  const getNodeCenter = (id: string) => {
    const n = nodes.find(node => node.id === id);
    if (!n) return { x: 0, y: 0 };
    return { x: n.x + n.width / 2, y: n.y + n.height / 2 };
  };

  const selectionPos = useMemo(() => {
    if (selectedNodeIds.size !== 1) return null;
    const id = Array.from(selectedNodeIds)[0];
    const node = nodes.find(n => n.id === id);
    if (!node) return null;
    return {
        x: (node.x + node.width / 2) * viewport.zoom + viewport.x,
        y: node.y * viewport.zoom + viewport.y
    };
  }, [selectedNodeIds, nodes, viewport]);

  return (
    <div className="w-screen h-screen overflow-hidden bg-[#f4f4f6] relative select-none">
      <Toolbar activeTool={activeTool} onSelectTool={setActiveTool} />
      
      <div 
        ref={containerRef}
        className={`w-full h-full dot-grid ${activeTool === ToolType.PAN || isPanning ? 'cursor-grab active:cursor-grabbing' : 'cursor-default'}`}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onWheel={handleWheel}
      >
        <div 
            style={{ 
                transform: `translate(${viewport.x}px, ${viewport.y}px) scale(${viewport.zoom})`,
                transformOrigin: '0 0',
                width: '100%',
                height: '100%'
            }}
            className="relative pointer-events-none"
        >
            {/* SVG Layer */}
            <svg className="absolute top-0 left-0 overflow-visible w-full h-full">
                {/* Existing Connections */}
                {connectors.map(conn => {
                    const s = getNodeCenter(conn.startNodeId);
                    const e = getNodeCenter(conn.endNodeId);
                    return (
                        <path 
                            key={conn.id}
                            d={`M ${s.x} ${s.y} L ${e.x} ${e.y}`}
                            stroke="#cbd5e1"
                            strokeWidth="2"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                        />
                    );
                })}

                {/* Connection Preview */}
                {connectionSourceId && (
                    <path 
                        d={`M ${getNodeCenter(connectionSourceId).x} ${getNodeCenter(connectionSourceId).y} L ${mouseCanvasPos.x} ${mouseCanvasPos.y}`}
                        stroke="#9333ea"
                        strokeWidth="2"
                        strokeDasharray="4 4"
                        fill="none"
                        markerEnd="url(#arrowhead-active)"
                    />
                )}
            </svg>

            {/* Nodes Layer */}
            <div className="absolute top-0 left-0 w-full h-full">
              {nodes.map(node => (
                  <Node 
                      key={node.id} 
                      node={node} 
                      isSelected={selectedNodeIds.has(node.id)}
                      isConnecting={activeTool === ToolType.CONNECTOR}
                      isConnectionSource={connectionSourceId === node.id}
                      onSelect={(e) => handleNodeSelect(e, node.id)}
                      onChange={updateNode}
                      scale={viewport.zoom}
                  />
              ))}
            </div>
        </div>
      </div>

      {selectionPos && (
        <PropertiesBar 
            x={selectionPos.x} 
            y={selectionPos.y} 
            zoom={viewport.zoom}
            onDelete={deleteSelected}
            onColorChange={(c) => {
                const id = Array.from(selectedNodeIds)[0];
                updateNode(id, { color: c });
            }}
            onGenerateAI={handleAIExpand}
        />
      )}

      {loadingAI && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white px-4 py-2 rounded-full shadow-lg border border-purple-100 flex items-center gap-2 z-50">
            <Loader2 className="animate-spin text-purple-600" size={18} />
            <span className="text-sm font-medium text-purple-900">Generating ideas...</span>
        </div>
      )}
      
      <div className="fixed bottom-4 right-4 flex flex-col items-end gap-1 text-[10px] text-gray-400 pointer-events-none select-none">
         <div>Space+Drag to Pan • Wheel to Zoom</div>
         <div>Shift+Click to keep tool active</div>
      </div>
    </div>
  );
};

export default Canvas;
