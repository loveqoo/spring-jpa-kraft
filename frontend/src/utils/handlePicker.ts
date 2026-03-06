import type { Node } from '@xyflow/react';

type Side = 'top' | 'right' | 'bottom' | 'left';

const OPPOSITE: Record<Side, Side> = {
  top: 'bottom',
  bottom: 'top',
  left: 'right',
  right: 'left',
};

export function pickHandles(
  sourceNode: { id: string; position: { x: number; y: number } },
  targetNode: { id: string; position: { x: number; y: number } },
): { sourceHandle: string; targetHandle: string } {
  const dx = targetNode.position.x - sourceNode.position.x;
  const dy = targetNode.position.y - sourceNode.position.y;

  let sourceSide: Side;
  // Pick the side based on which axis has the larger delta
  if (Math.abs(dx) >= Math.abs(dy)) {
    sourceSide = dx >= 0 ? 'right' : 'left';
  } else {
    sourceSide = dy >= 0 ? 'bottom' : 'top';
  }

  const targetSide = OPPOSITE[sourceSide];

  return {
    sourceHandle: `${sourceNode.id}-${sourceSide}`,
    targetHandle: `${targetNode.id}-${targetSide}`,
  };
}

export function recalculateEdgeHandles(
  edges: { id: string; source: string; target: string; [key: string]: unknown }[],
  nodes: Node[],
) {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return edges.map((edge) => {
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!sourceNode || !targetNode) return edge;

    const { sourceHandle, targetHandle } = pickHandles(sourceNode, targetNode);
    return { ...edge, sourceHandle, targetHandle };
  });
}
