import { useState, useCallback, useRef, useEffect } from 'react';
import { BaseEdge, getSmoothStepPath, EdgeLabelRenderer, Position, useReactFlow } from '@xyflow/react';
import type { EdgeProps } from '@xyflow/react';

type Cardinality = 'One' | 'Many';

function toCardinality(relationType: string, side: 'source' | 'target'): Cardinality {
  if (relationType === 'ManyToOne') return side === 'source' ? 'Many' : 'One';
  if (relationType === 'OneToMany') return side === 'source' ? 'One' : 'Many';
  return 'One';
}

/** Compute label position near the endpoint, offset along the first path segment */
function labelPosition(
  x: number,
  y: number,
  position: Position,
  dist: number,
): { x: number; y: number } {
  switch (position) {
    case Position.Right:
      return { x: x + dist, y };
    case Position.Left:
      return { x: x - dist, y };
    case Position.Bottom:
      return { x, y: y + dist };
    case Position.Top:
      return { x, y: y - dist };
  }
}

/** Determine how a path arrives at / departs from the waypoint */
function waypointPositions(
  sx: number,
  sy: number,
  mx: number,
  my: number,
  tx: number,
  ty: number,
): { arrive: Position; depart: Position } {
  const dxIn = mx - sx;
  const dyIn = my - sy;
  const arrive =
    Math.abs(dxIn) >= Math.abs(dyIn)
      ? dxIn >= 0
        ? Position.Left
        : Position.Right
      : dyIn >= 0
        ? Position.Top
        : Position.Bottom;

  const dxOut = tx - mx;
  const dyOut = ty - my;
  const depart =
    Math.abs(dxOut) >= Math.abs(dyOut)
      ? dxOut >= 0
        ? Position.Right
        : Position.Left
      : dyOut >= 0
        ? Position.Bottom
        : Position.Top;

  return { arrive, depart };
}

const LABEL_STYLE: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 600,
  padding: '1px 7px',
  borderRadius: 10,
  pointerEvents: 'none',
  whiteSpace: 'nowrap',
};

export default function RelationEdge(props: EdgeProps) {
  const {
    id,
    sourceX,
    sourceY,
    sourcePosition,
    targetX,
    targetY,
    targetPosition,
    data,
    selected,
  } = props;
  const [hovered, setHovered] = useState(false);
  const [dragging, setDragging] = useState(false);
  const { screenToFlowPosition } = useReactFlow();
  const cleanupRef = useRef<(() => void) | null>(null);

  // Cleanup window listeners on unmount
  useEffect(() => {
    return () => { cleanupRef.current?.(); };
  }, []);

  const updateWaypoint = data?.updateWaypoint as
    | ((edgeId: string, x: number | null, y: number | null) => void)
    | undefined;

  // Waypoint (user-dragged midpoint)
  const hasWaypoint = data?.midX != null && data?.midY != null;
  const midX = hasWaypoint ? (data!.midX as number) : (sourceX + targetX) / 2;
  const midY = hasWaypoint ? (data!.midY as number) : (sourceY + targetY) / 2;

  let edgePath: string;

  if (hasWaypoint) {
    const { arrive, depart } = waypointPositions(
      sourceX,
      sourceY,
      midX,
      midY,
      targetX,
      targetY,
    );
    const [path1] = getSmoothStepPath({
      sourceX, sourceY, sourcePosition,
      targetX: midX, targetY: midY, targetPosition: arrive,
      borderRadius: 8,
    });
    const [path2] = getSmoothStepPath({
      sourceX: midX, sourceY: midY, sourcePosition: depart,
      targetX, targetY, targetPosition,
      borderRadius: 8,
    });
    // Concatenate paths: strip the M (moveto) command from path2
    edgePath = path1 + ' ' + path2.replace(/^M\s*[\d.-]+[\s,]+[\d.-]+\s*/, '');
  } else {
    [edgePath] = getSmoothStepPath({
      sourceX, sourceY, sourcePosition,
      targetX, targetY, targetPosition,
      borderRadius: 8,
    });
  }

  const confirmed = data?.confirmed === true;
  const sourceRel = (data?.sourceRelationType as string) ?? 'ManyToOne';

  const sourceCard = toCardinality(sourceRel, 'source');
  const targetCard = toCardinality(sourceRel, 'target');

  const baseColor = confirmed ? '#1677ff' : '#999';
  const activeColor = selected ? '#1677ff' : hovered ? '#4096ff' : baseColor;
  const strokeWidth = selected || hovered ? 2.5 : 1.5;

  // Labels near their respective endpoints
  const LABEL_DIST = 26;
  const srcLabel = labelPosition(sourceX, sourceY, sourcePosition, LABEL_DIST);
  const tgtLabel = labelPosition(targetX, targetY, targetPosition, LABEL_DIST);

  const labelBg = confirmed ? '#e6f4ff' : '#fff7e6';
  const labelColor = confirmed ? '#1677ff' : '#d48806';
  const labelBorder = confirmed ? '#91caff' : '#ffd666';

  const onMouseEnter = useCallback(() => setHovered(true), []);
  const onMouseLeave = useCallback(() => setHovered(false), []);

  // Drag the waypoint handle
  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (!updateWaypoint) return;
      e.stopPropagation();
      e.preventDefault();
      setDragging(true);

      const onPointerMove = (ev: PointerEvent) => {
        const pos = screenToFlowPosition({ x: ev.clientX, y: ev.clientY });
        updateWaypoint(id, pos.x, pos.y);
      };

      const cleanup = () => {
        setDragging(false);
        window.removeEventListener('pointermove', onPointerMove);
        window.removeEventListener('pointerup', onPointerUp);
        cleanupRef.current = null;
      };

      const onPointerUp = () => cleanup();

      window.addEventListener('pointermove', onPointerMove);
      window.addEventListener('pointerup', onPointerUp);
      cleanupRef.current = cleanup;
    },
    [id, updateWaypoint, screenToFlowPosition],
  );

  // Double-click to reset waypoint
  const handleDoubleClick = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      updateWaypoint?.(id, null, null);
    },
    [id, updateWaypoint],
  );

  const showHandle = selected || hovered || dragging;

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
        {/* Source label */}
        <div
          style={{
            ...LABEL_STYLE,
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${srcLabel.x}px, ${srcLabel.y}px)`,
            background: labelBg,
            color: labelColor,
            border: `1px solid ${labelBorder}`,
          }}
        >
          {sourceCard}
        </div>
        {/* Target label */}
        <div
          style={{
            ...LABEL_STYLE,
            position: 'absolute',
            transform: `translate(-50%, -50%) translate(${tgtLabel.x}px, ${tgtLabel.y}px)`,
            background: labelBg,
            color: labelColor,
            border: `1px solid ${labelBorder}`,
          }}
        >
          {targetCard}
        </div>
        {/* Draggable waypoint handle */}
        {showHandle && (
          <div
            style={{
              position: 'absolute',
              transform: `translate(-50%, -50%) translate(${midX}px, ${midY}px)`,
              width: 14,
              height: 14,
              borderRadius: '50%',
              background: dragging ? '#1677ff' : hasWaypoint ? '#4096ff' : '#fff',
              border: `2px solid ${dragging ? '#1677ff' : '#4096ff'}`,
              cursor: dragging ? 'grabbing' : 'grab',
              pointerEvents: 'all',
              zIndex: 10,
              transition: 'background 0.15s',
            }}
            onPointerDown={handlePointerDown}
            onDoubleClick={handleDoubleClick}
            title={hasWaypoint ? 'Double-click to reset' : 'Drag to adjust path'}
          />
        )}
      </EdgeLabelRenderer>
    </>
  );
}
