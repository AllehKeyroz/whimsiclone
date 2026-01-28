import { CanvasNode, ShapeType } from '../types';

interface Point {
  x: number;
  y: number;
}

// Helper to accept either a full CanvasNode or a geometry object
interface NodeGeometry {
    x: number;
    y: number;
    width: number;
    height: number;
    shapeType?: ShapeType | string;
}

export const getRectIntersection = (node: NodeGeometry, targetPoint: Point): Point => {
    const cx = node.x + node.width / 2;
    const cy = node.y + node.height / 2;

    const w = node.width / 2;
    const h = node.height / 2;

    const dx = targetPoint.x - cx;
    const dy = targetPoint.y - cy;

    if (dx === 0 && dy === 0) return { x: cx, y: cy };

    if (node.shapeType === ShapeType.CIRCLE) {
        const angle = Math.atan2(dy, dx);
        // Assuming circle fits in the box. Use the smaller dimension for radius to be safe
        const r = Math.min(w, h);
        return {
            x: cx + Math.cos(angle) * r,
            y: cy + Math.sin(angle) * r
        };
    }

    if (node.shapeType === ShapeType.DIAMOND) {
        // Diamond equation: |x|/w + |y|/h = 1 (relative to center)
        // Let intersection be (tx, ty). t is a scaler.
        // |t*dx|/w + |t*dy|/h = 1
        // t * (|dx|/w + |dy|/h) = 1
        // t = 1 / (|dx|/w + |dy|/h)
        const absDx = Math.abs(dx);
        const absDy = Math.abs(dy);
        if (absDx === 0 && absDy === 0) return { x: cx, y: cy };

        const t = 1 / ( (absDx / w) + (absDy / h) );
        return {
            x: cx + dx * t,
            y: cy + dy * t
        };
    }

    // Default: Rectangle (and Pill/Text for now)
    const scaleX = w / Math.abs(dx);
    const scaleY = h / Math.abs(dy);
    const scale = Math.min(scaleX, scaleY);

    return {
        x: cx + dx * scale,
        y: cy + dy * scale
    };
};
