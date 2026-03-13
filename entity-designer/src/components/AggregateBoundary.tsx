import { useViewport } from '@xyflow/react';
import type { Node } from '@xyflow/react';
import { AGGREGATE_COLORS, getRootColorIndex } from '../hooks/useAggregateState';
import { computeBoundaryBoxes } from '../utils/boundaryHitTest';

const HEADER_HEIGHT = 28;

interface Props {
  roots: Set<string>;
  aggregateAssignments: Record<string, string>;
  nodes: Node[];
}

export default function AggregateBoundary({ roots, aggregateAssignments, nodes }: Props) {
  const { x, y, zoom } = useViewport();
  const boxes = computeBoundaryBoxes(roots, aggregateAssignments, nodes);

  if (boxes.length === 0) return null;

  return (
    <svg
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 0,
      }}
    >
      <g transform={`translate(${x}, ${y}) scale(${zoom})`}>
        {boxes.map((b) => {
          const colorIdx = getRootColorIndex(roots, b.rootName);
          const color = AGGREGATE_COLORS[colorIdx];
          return (
            <g key={b.rootName}>
              <rect
                x={b.x}
                y={b.y}
                width={b.width}
                height={b.height}
                rx={12}
                ry={12}
                fill={color.bg}
                stroke={color.border}
                strokeWidth={2}
                strokeDasharray="8,4"
                opacity={0.6}
              />
              <rect
                x={b.x}
                y={b.y}
                width={b.width}
                height={HEADER_HEIGHT}
                rx={12}
                ry={12}
                fill={color.border}
                opacity={0.15}
              />
              <text
                x={b.x + 12}
                y={b.y + HEADER_HEIGHT / 2 + 1}
                dominantBaseline="middle"
                fill={color.border}
                fontSize={12}
                fontWeight={700}
                fontFamily="system-ui, sans-serif"
              >
                Aggregate: {b.rootName}
              </text>
            </g>
          );
        })}
      </g>
    </svg>
  );
}
