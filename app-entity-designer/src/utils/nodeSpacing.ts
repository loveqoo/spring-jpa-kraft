import type { Node } from '@xyflow/react';

const MIN_GAP = 80;
const DEFAULT_WIDTH = 240;
const DEFAULT_HEIGHT = 120;

interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

function nodeRect(node: Node): Rect {
  return {
    x: node.position.x,
    y: node.position.y,
    w: node.measured?.width ?? DEFAULT_WIDTH,
    h: node.measured?.height ?? DEFAULT_HEIGHT,
  };
}

function overlaps(a: Rect, b: Rect, gap: number): boolean {
  return (
    a.x < b.x + b.w + gap &&
    a.x + a.w + gap > b.x &&
    a.y < b.y + b.h + gap &&
    a.y + a.h + gap > b.y
  );
}

/**
 * Enforce minimum spacing for a moved node against all other nodes.
 * Pushes the moved node to the nearest valid position.
 */
export function enforceSpacing(nodes: Node[], movedNodeId: string): Node[] {
  const movedIdx = nodes.findIndex((n) => n.id === movedNodeId);
  if (movedIdx === -1) return nodes;

  const moved = nodes[movedIdx];
  const movedRect = nodeRect(moved);
  let { x: newX, y: newY } = moved.position;

  for (let i = 0; i < nodes.length; i++) {
    if (i === movedIdx) continue;
    const other = nodes[i];
    const otherRect = nodeRect(other);

    if (!overlaps({ ...movedRect, x: newX, y: newY }, otherRect, MIN_GAP)) continue;

    // Calculate overlap on each axis
    const overlapLeft = newX + movedRect.w + MIN_GAP - otherRect.x;
    const overlapRight = otherRect.x + otherRect.w + MIN_GAP - newX;
    const overlapTop = newY + movedRect.h + MIN_GAP - otherRect.y;
    const overlapBottom = otherRect.y + otherRect.h + MIN_GAP - newY;

    // Push out along the axis with smallest overlap
    const minOverlap = Math.min(overlapLeft, overlapRight, overlapTop, overlapBottom);

    if (minOverlap === overlapLeft) {
      newX = otherRect.x - movedRect.w - MIN_GAP;
    } else if (minOverlap === overlapRight) {
      newX = otherRect.x + otherRect.w + MIN_GAP;
    } else if (minOverlap === overlapTop) {
      newY = otherRect.y - movedRect.h - MIN_GAP;
    } else {
      newY = otherRect.y + otherRect.h + MIN_GAP;
    }
  }

  if (newX === moved.position.x && newY === moved.position.y) return nodes;

  const result = [...nodes];
  result[movedIdx] = { ...moved, position: { x: newX, y: newY } };
  return result;
}
