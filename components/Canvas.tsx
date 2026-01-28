
import React, { useState, useRef, useEffect, useMemo, useCallback } from 'react';
import { CanvasNode, Connector, NodeType, ToolType, Viewport, NodeColor, ShapeType } from '../types';
import Node from './Node';
import Toolbar from './Toolbar';
import PropertiesBar from './PropertiesBar';
import { generateMindMapData } from '../services/geminiService';
import { Loader2 } from 'lucide-react';
import { getRectIntersection } from '../utils/geometry';

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

  // Selection Box State
  const [selectionBox, setSelectionBox] = useState<{startX: number, startY: number, endX: number, endY: number} | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const dragTargetRef = useRef<'viewport' | 'node' | 'selection' | null>(null);
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
        if (activeTool === ToolType.SELECT) {
            // Start Rubber Band Selection
            dragTargetRef.current = 'selection';
            setSelectionBox({ startX: x, startY: y, endX: x, endY: y });
            if (!e.shiftKey) setSelectedNodeIds(new Set());
            setConnectionSourceId(null);
        } else if (activeTool !== ToolType.CONNECTOR) {
            const newNode = createNode(activeTool as unknown as NodeType, x, y);
            setNodes(prev => [...prev, newNode]);
            setSelectedNodeIds(new Set([newNode.id]));
            if (!e.shiftKey) setActiveTool(ToolType.SELECT);
        } else {
            // Connector tool click on canvas - clear selection
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
    } else if (dragTargetRef.current === 'selection' && selectionBox) {
        setSelectionBox(prev => prev ? { ...prev, endX: x, endY: y } : null);
    }
  };

  const handleMouseUp = () => {
    if (dragTargetRef.current === 'selection' && selectionBox) {
        // Calculate intersection
        const x1 = Math.min(selectionBox.startX, selectionBox.endX);
        const x2 = Math.max(selectionBox.startX, selectionBox.endX);
        const y1 = Math.min(selectionBox.startY, selectionBox.endY);
        const y2 = Math.max(selectionBox.startY, selectionBox.endY);

        const newSelected = new Set(selectedNodeIds);
        nodes.forEach(node => {
            if (node.x < x2 && node.x + node.width > x1 &&
                node.y < y2 && node.y + node.height > y1) {
                newSelected.add(node.id);
            }
        });
        setSelectedNodeIds(newSelected);
        setSelectionBox(null);
    }
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

    // Ctrl+Drag or Alt+Drag to duplicate
    if (e.altKey || (e.ctrlKey && !e.metaKey)) { // metaKey check to avoid conflict with standard Mac shortcuts if needed, but usually Ctrl+Click is right click on Mac.
        // Wait, on Mac Ctrl+Click is often right click. But user specifically asked for "ctrl + arrastar".
        // Let's support Alt (Option) as well as it's standard.

        let nodesToCloneIds = new Set([id]);
        if (selectedNodeIds.has(id)) {
            nodesToCloneIds = selectedNodeIds;
        }

        const newNodes: CanvasNode[] = [];
        const newIds = new Set<string>();

        nodes.forEach(node => {
            if (nodesToCloneIds.has(node.id)) {
                const newNode = { ...node, id: generateId() };
                newNodes.push(newNode);
                newIds.add(newNode.id);
            }
        });

        setNodes(prev => [...prev, ...newNodes]);
        setSelectedNodeIds(newIds);
        dragTargetRef.current = 'node';
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

  const deleteSelected = useCallback(() => {
    setNodes(prev => prev.filter(n => !selectedNodeIds.has(n.id)));
    setConnectors(prev => prev.filter(c => !selectedNodeIds.has(c.startNodeId) && !selectedNodeIds.has(c.endNodeId)));
    setSelectedNodeIds(new Set());
    setConnectionSourceId(null);
  }, [selectedNodeIds]);

  const duplicateSelected = useCallback(() => {
    if (selectedNodeIds.size === 0) return;

    setNodes(prev => {
        const newNodes: CanvasNode[] = [];
        const newIds = new Set<string>();

        prev.forEach(node => {
            if (selectedNodeIds.has(node.id)) {
                const newNode = {
                    ...node,
                    id: generateId(),
                    x: node.x + 20,
                    y: node.y + 20
                };
                newNodes.push(newNode);
                newIds.add(newNode.id);
            }
        });

        if (newNodes.length > 0) {
            // We need to update selection to the new nodes, but we are inside a state update.
            // We can trigger it via a setTimeout or by returning the new state and setting selection separately.
            // However, since we can't easily sync state updates here without refs, let's just update nodes here.
            // And use a side-effect (which is not pure, but React batching handles it usually) or a layout effect?
            // Actually, best to just invoke `setSelectedNodeIds` here since it's an event handler.
            // BUT this is inside the callback function passed to setNodes, so it's pure logic.
            // Wait, I can't call setSelectedNodeIds INSIDE setNodes callback cleanly.

            // Revert to using a Ref for nodes to avoid dependency on 'nodes' array for the closure.
            return [...prev, ...newNodes];
        }
        return prev;
    });

    // To update selection, we need to know the IDs. We can recalculate or refactor.
    // Let's use the nodesRef pattern instead for cleaner code.
  }, [selectedNodeIds]);

  // Ref for nodes to access current state in event listeners without re-binding
  const nodesRef = useRef(nodes);
  useEffect(() => { nodesRef.current = nodes; }, [nodes]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
        if (e.target instanceof HTMLTextAreaElement || e.target instanceof HTMLInputElement) {
            return;
        }

        if (e.key === 'Delete' || e.key === 'Backspace') {
            deleteSelected();
        } else if (e.key === 'Escape') {
            setSelectedNodeIds(new Set());
            setConnectionSourceId(null);
            setActiveTool(ToolType.SELECT);
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'a') {
            e.preventDefault();
            setSelectedNodeIds(new Set(nodesRef.current.map(n => n.id)));
        } else if ((e.ctrlKey || e.metaKey) && e.key === 'd') {
            e.preventDefault();
            // Duplicate logic inline or call function that uses ref
            const currentNodes = nodesRef.current;
            const newNodes: CanvasNode[] = [];
            const newIds = new Set<string>();

            currentNodes.forEach(node => {
                if (selectedNodeIds.has(node.id)) {
                    const newNode = {
                        ...node,
                        id: generateId(),
                        x: node.x + 20,
                        y: node.y + 20
                    };
                    newNodes.push(newNode);
                    newIds.add(newNode.id);
                }
            });

            if (newNodes.length > 0) {
                setNodes(prev => [...prev, ...newNodes]);
                setSelectedNodeIds(newIds);
            }
        }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [deleteSelected, selectedNodeIds]); // removed nodes dependency

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

  const getConnectionPoints = (startId: string, endId: string) => {
    const startNode = nodes.find(n => n.id === startId);
    const endNode = nodes.find(n => n.id === endId);

    if (!startNode || !endNode) return { start: { x:0, y:0 }, end: { x:0, y:0 } };

    const startCenter = getNodeCenter(startId);
    const endCenter = getNodeCenter(endId);

    // Calculate intersection points
    const start = getRectIntersection(startNode, endCenter);
    const end = getRectIntersection(endNode, startCenter);

    return { start, end };
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
                    const { start, end } = getConnectionPoints(conn.startNodeId, conn.endNodeId);
                    return (
                        <path 
                            key={conn.id}
                            d={`M ${start.x} ${start.y} L ${end.x} ${end.y}`}
                            stroke="#cbd5e1"
                            strokeWidth="2"
                            fill="none"
                            markerEnd="url(#arrowhead)"
                        />
                    );
                })}

                {/* Connection Preview */}
                {connectionSourceId && (() => {
                    const sourceNode = nodes.find(n => n.id === connectionSourceId);
                    if (!sourceNode) return null;
                    const start = getRectIntersection(sourceNode, mouseCanvasPos);
                    return (
                        <path
                            d={`M ${start.x} ${start.y} L ${mouseCanvasPos.x} ${mouseCanvasPos.y}`}
                            stroke="#9333ea"
                            strokeWidth="2"
                            strokeDasharray="4 4"
                            fill="none"
                            markerEnd="url(#arrowhead-active)"
                        />
                    );
                })()}
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

            {/* Selection Box */}
            {selectionBox && (
                <div
                    className="absolute bg-purple-500/10 border border-purple-500/50 pointer-events-none"
                    style={{
                        left: Math.min(selectionBox.startX, selectionBox.endX),
                        top: Math.min(selectionBox.startY, selectionBox.endY),
                        width: Math.abs(selectionBox.endX - selectionBox.startX),
                        height: Math.abs(selectionBox.endY - selectionBox.startY)
                    }}
                />
            )}
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
