import type { Edge, Node } from '@xyflow/react';

export type Side = 'top' | 'right' | 'bottom' | 'left';

export const SIDES: Side[] = ['top', 'right', 'bottom', 'left'];

const OPPOSITE: Record<Side, Side> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

const HANDLES_PER_SIDE = 4;

/** Pick the best side pair between two nodes based on relative position */
function pickSides(
  sourceNode: { position: { x: number; y: number } },
  targetNode: { position: { x: number; y: number } },
): { sourceSide: Side; targetSide: Side } {
  const dx = targetNode.position.x - sourceNode.position.x;
  const dy = targetNode.position.y - sourceNode.position.y;

  let sourceSide: Side;
  if (Math.abs(dx) >= Math.abs(dy)) {
    sourceSide = dx >= 0 ? 'right' : 'left';
  } else {
    sourceSide = dy >= 0 ? 'bottom' : 'top';
  }

  return { sourceSide, targetSide: OPPOSITE[sourceSide] };
}

/**
 * Distribute N edges across HANDLES_PER_SIDE handle slots, centering them.
 * Returns the handle index (0-based) for the given position.
 */
function distributeIndex(position: number, total: number): number {
  if (total <= 0) return 1;
  if (total === 1) return 1;
  if (total >= HANDLES_PER_SIDE) return Math.min(position, HANDLES_PER_SIDE - 1);
  const start = Math.floor((HANDLES_PER_SIDE - total) / 2);
  return start + position;
}

/**
 * Extract the side from a handle ID.
 * Supports both `{name}-{side}-{index}` and legacy `{name}-{side}` formats.
 */
export function extractSide(handleId: string | null | undefined): Side {
  if (!handleId) return 'right';
  const match = handleId.match(/-(top|right|bottom|left)(?:-\d+)?$/);
  return (match?.[1] as Side) ?? 'right';
}

/**
 * Pick default handles for a new edge (center position on best side).
 */
export function pickHandles(
  sourceNode: { id: string; position: { x: number; y: number } },
  targetNode: { id: string; position: { x: number; y: number } },
): { sourceHandle: string; targetHandle: string } {
  const { sourceSide, targetSide } = pickSides(sourceNode, targetNode);
  return {
    sourceHandle: `${sourceNode.id}-${sourceSide}-1`,
    targetHandle: `${targetNode.id}-${targetSide}-1`,
  };
}

/**
 * Recalculate all edge handles, distributing multiple edges on the same
 * node+side across the available handle slots.
 */
export function recalculateEdgeHandles<E extends Edge>(edges: E[], nodes: Node[]): E[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  // Step 1: determine best side for each non-manual edge
  const edgeSides: ({ sourceSide: Side; targetSide: Side } | null)[] = edges.map((edge) => {
    if ((edge as Edge).data?.manualHandles) return null;
    const src = nodeMap.get(edge.source);
    const tgt = nodeMap.get(edge.target);
    if (!src || !tgt) return null;
    return pickSides(src, tgt);
  });

  // Step 2: group edge indices by node::side
  const sideGroups = new Map<string, number[]>();
  edgeSides.forEach((sides, i) => {
    if (!sides) return;
    const srcKey = `${edges[i].source}::${sides.sourceSide}`;
    const tgtKey = `${edges[i].target}::${sides.targetSide}`;
    if (!sideGroups.has(srcKey)) sideGroups.set(srcKey, []);
    sideGroups.get(srcKey)!.push(i);
    if (!sideGroups.has(tgtKey)) sideGroups.set(tgtKey, []);
    sideGroups.get(tgtKey)!.push(i);
  });

  // Step 3: assign distributed handle indices
  return edges.map((edge, i) => {
    const sides = edgeSides[i];
    if (!sides) return edge;

    const srcKey = `${edge.source}::${sides.sourceSide}`;
    const tgtKey = `${edge.target}::${sides.targetSide}`;
    const srcGroup = sideGroups.get(srcKey)!;
    const tgtGroup = sideGroups.get(tgtKey)!;

    const srcIdx = distributeIndex(srcGroup.indexOf(i), srcGroup.length);
    const tgtIdx = distributeIndex(tgtGroup.indexOf(i), tgtGroup.length);

    return {
      ...edge,
      sourceHandle: `${edge.source}-${sides.sourceSide}-${srcIdx}`,
      targetHandle: `${edge.target}-${sides.targetSide}-${tgtIdx}`,
    };
  });
}
