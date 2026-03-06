import { useState, useCallback } from 'react';
import { BaseEdge, getStraightPath, EdgeLabelRenderer } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

type Cardinality = 'One' | 'Many';

function toCardinality(relationType: string, side: 'source' | 'target'): Cardinality {
  if (relationType === 'ManyToOne') return side === 'source' ? 'Many' : 'One';
  if (relationType === 'OneToMany') return side === 'source' ? 'One' : 'Many';
  return 'One';
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  padding: '2px 8px',
  borderRadius: 10,
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
};

export default function RelationEdge(props: EdgeProps) {
  const { id, sourceX, sourceY, targetX, targetY, data, selected } = props;
  const [hovered, setHovered] = useState(false);

  const [edgePath, labelX, labelY] = getStraightPath({ sourceX, sourceY, targetX, targetY });

  const confirmed = data?.confirmed === true;
  const sourceRel = (data?.sourceRelationType as string) ?? 'ManyToOne';

  const sourceCard = toCardinality(sourceRel, 'source');
  const targetCard = toCardinality(sourceRel, 'target');

  const baseColor = confirmed ? '#1677ff' : '#999';
  const activeColor = selected ? '#1677ff' : hovered ? '#4096ff' : baseColor;
  const strokeWidth = selected || hovered ? 2.5 : 1.5;

  // Perpendicular offset direction: rotate edge vector 90 degrees
  const dx = targetX - sourceX;
  const dy = targetY - sourceY;
  const len = Math.sqrt(dx * dx + dy * dy) || 1;
  // Unit perpendicular vector (rotated -90deg so labels go "above" the line visually)
  const px = -dy / len;
  const py = dx / len;

  const OFFSET = 14; // perpendicular distance from edge line
  const SPREAD = Math.max(40, len * 0.25); // quarter of edge length, min 40px

  // Along-edge unit vector
  const ax = dx / len;
  const ay = dy / len;

  // Source label: midpoint shifted toward source + perpendicular offset
  const srcLabelX = labelX - ax * SPREAD + px * OFFSET;
  const srcLabelY = labelY - ay * SPREAD + py * OFFSET;
  // Target label: midpoint shifted toward target + perpendicular offset
  const tgtLabelX = labelX + ax * SPREAD + px * OFFSET;
  const tgtLabelY = labelY + ay * SPREAD + py * OFFSET;

  const labelBg = confirmed ? '#e6f4ff' : '#fff7e6';
  const labelColor = confirmed ? '#1677ff' : '#d48806';
  const labelBorder = confirmed ? '#91caff' : '#ffd666';

  const onMouseEnter = useCallback(() => setHovered(true), []);
  const onMouseLeave = useCallback(() => setHovered(false), []);

  return (
    <>
      <path
        d={edgePath}
        fill="none"
        stroke="transparent"
        strokeWidth={20}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={{ cursor: 'pointer' }}
      />
      <BaseEdge
        id={id}
        path={edgePath}
        style={{
          stroke: activeColor,
          strokeWidth,
          strokeDasharray: confirmed ? undefined : '6,4',
          transition: 'stroke 0.15s, stroke-width 0.15s',
        }}
      />
      <EdgeLabelRenderer>
        <div
          style={{
            ...LABEL_STYLE,
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${srcLabelX}px, ${srcLabelY}px)`,
            background: labelBg,
            color: labelColor,
            border: `1px solid ${labelBorder}`,
          }}
        >
          {sourceCard}
        </div>
        <div
          style={{
            ...LABEL_STYLE,
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${tgtLabelX}px, ${tgtLabelY}px)`,
            background: labelBg,
            color: labelColor,
            border: `1px solid ${labelBorder}`,
          }}
        >
          {targetCard}
        </div>
      </EdgeLabelRenderer>
    </>
  );
}
