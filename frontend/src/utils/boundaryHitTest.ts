import type { Node } from '@xyflow/react';

const PADDING = 24;
const HEADER_HEIGHT = 28;
const NODE_WIDTH = 240;

export interface BoundaryBox {
  rootName: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

export function computeBoundaryBoxes(
  roots: Set<string>,
  assignments: Record<string, string>,
  nodes: Node[],
): BoundaryBox[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));
  const boxes: BoundaryBox[] = [];

  for (const root of roots) {
    const memberIds = [root, ...Object.entries(assignments).filter(([, r]) => r === root).map(([e]) => e)];
    const memberNodes = memberIds.map((id) => nodeMap.get(id)).filter((n): n is Node => !!n);

    if (memberNodes.length === 0) continue;

    let minX = Infinity,
      minY = Infinity,
      maxX = -Infinity,
      maxY = -Infinity;
    for (const node of memberNodes) {
      const x = node.position.x;
      const y = node.position.y;
      const w = node.measured?.width ?? NODE_WIDTH;
      const h = node.measured?.height ?? 120;
      minX = Math.min(minX, x);
      minY = Math.min(minY, y);
      maxX = Math.max(maxX, x + w);
      maxY = Math.max(maxY, y + h);
    }

    boxes.push({
      rootName: root,
      x: minX - PADDING,
      y: minY - PADDING - HEADER_HEIGHT,
      width: maxX - minX + PADDING * 2,
      height: maxY - minY + PADDING * 2 + HEADER_HEIGHT,
    });
  }

  return boxes;
}

/**
 * Check which aggregate boundary a node's center falls into.
 * Excludes the node itself from boundary calculation to avoid self-reference.
 */
export function hitTestAggregate(
  nodeId: string,
  nodePosition: { x: number; y: number },
  nodeWidth: number,
  nodeHeight: number,
  roots: Set<string>,
  assignments: Record<string, string>,
  allNodes: Node[],
): string | null {
  // Temporarily remove this node from assignments to get "other members" boundaries
  const tempAssignments = { ...assignments };
  delete tempAssignments[nodeId];

  const boxes = computeBoundaryBoxes(roots, tempAssignments, allNodes);

  // Node center
  const cx = nodePosition.x + nodeWidth / 2;
  const cy = nodePosition.y + nodeHeight / 2;

  for (const box of boxes) {
    if (
      cx >= box.x &&
      cx <= box.x + box.width &&
      cy >= box.y &&
      cy <= box.y + box.height
    ) {
      return box.rootName;
    }
  }

  return null;
}
