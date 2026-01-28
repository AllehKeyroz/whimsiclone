export enum NodeType {
  STICKY = 'STICKY',
  SHAPE = 'SHAPE',
  TEXT = 'TEXT',
}

export enum ShapeType {
  RECTANGLE = 'RECTANGLE',
  CIRCLE = 'CIRCLE',
  PILL = 'PILL',
  DIAMOND = 'DIAMOND'
}

export enum ToolType {
  SELECT = 'SELECT',
  PAN = 'PAN',
  STICKY = 'STICKY',
  SHAPE = 'SHAPE',
  TEXT = 'TEXT',
  CONNECTOR = 'CONNECTOR'
}

export enum NodeColor {
  YELLOW = 'bg-yellow-100 border-yellow-200',
  BLUE = 'bg-blue-100 border-blue-200',
  GREEN = 'bg-green-100 border-green-200',
  PINK = 'bg-pink-100 border-pink-200',
  PURPLE = 'bg-purple-100 border-purple-200',
  WHITE = 'bg-white border-gray-200',
  TRANSPARENT = 'bg-transparent border-transparent'
}

export interface CanvasNode {
  id: string;
  type: NodeType;
  shapeType?: ShapeType; // Only for SHAPE
  x: number;
  y: number;
  width: number;
  height: number;
  text: string;
  color: NodeColor;
  parentId?: string; // For simple hierarchy/grouping
}

export interface Connector {
  id: string;
  startNodeId: string;
  endNodeId?: string; // Optional if connected to point
  endPosition?: { x: number, y: number }; // Optional if connected to node
}

export interface Viewport {
  x: number;
  y: number;
  zoom: number;
}
