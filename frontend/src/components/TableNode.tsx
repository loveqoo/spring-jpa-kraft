import { memo } from 'react';
import { Handle, Position } from '@xyflow/react';
import type { NodeProps } from '@xyflow/react';
import { Tag } from 'antd';
import { KeyOutlined, CrownOutlined, CloseOutlined, NodeIndexOutlined } from '@ant-design/icons';
import type { TableDef, TableColumn } from '../types/tableSchema';

interface AggregateColor {
  border: string;
  bg: string;
  headerBg: string;
}

interface TableNodeData {
  table: TableDef;
  isRoot?: boolean;
  aggregateColor?: AggregateColor | null;
  onRemoveFromAggregate?: () => void;
  hiddenColumns?: string[];
  [key: string]: unknown;
}

const HANDLE_POSITIONS = [20, 40, 60, 80]; // percentage positions per side

const handleStyle = { width: 5, height: 5, background: '#bfbfbf' };

function TableNode({ data }: NodeProps) {
  const { table, isRoot, aggregateColor, onRemoveFromAggregate, hiddenColumns } = data as TableNodeData;
  const hidden = new Set(hiddenColumns ?? []);
  const pkColumns = table.columns.filter((c: TableColumn) => c.primaryKey && !hidden.has(c.name));
  const regularColumns = table.columns.filter((c: TableColumn) => !c.primaryKey && !hidden.has(c.name));
  const indexedColumns = new Set(table.indexes?.flatMap((idx) => idx.columns) ?? []);

  const borderColor = isRoot
    ? (aggregateColor?.border ?? '#1677ff')
    : aggregateColor
      ? aggregateColor.border
      : '#d9d9d9';

  const headerBg = isRoot
    ? (aggregateColor?.headerBg ?? '#bae0ff')
    : aggregateColor
      ? aggregateColor.bg
      : '#fafafa';

  const borderWidth = isRoot ? 3 : aggregateColor ? 2 : 1;

  const showRemove = !isRoot && !!aggregateColor && !!onRemoveFromAggregate;

  return (
    <div
      style={{
        background: '#fff',
        border: `${borderWidth}px solid ${borderColor}`,
        borderRadius: 8,
        minWidth: 220,
        fontSize: 13,
        boxShadow: isRoot
          ? `0 0 0 3px ${aggregateColor?.border ?? '#1677ff'}33`
          : '0 1px 4px rgba(0,0,0,0.08)',
      }}
    >
      {/* 4 handles per side = 16 total */}
      {HANDLE_POSITIONS.map((pct, i) => (
        <Handle
          key={`top-${i}`}
          type="source"
          position={Position.Top}
          id={`${table.name}-top-${i}`}
          style={{ ...handleStyle, left: `${pct}%` }}
          isConnectable={true}
        />
      ))}
      {HANDLE_POSITIONS.map((pct, i) => (
        <Handle
          key={`right-${i}`}
          type="source"
          position={Position.Right}
          id={`${table.name}-right-${i}`}
          style={{ ...handleStyle, top: `${pct}%` }}
          isConnectable={true}
        />
      ))}
      {HANDLE_POSITIONS.map((pct, i) => (
        <Handle
          key={`bottom-${i}`}
          type="source"
          position={Position.Bottom}
          id={`${table.name}-bottom-${i}`}
          style={{ ...handleStyle, left: `${pct}%` }}
          isConnectable={true}
        />
      ))}
      {HANDLE_POSITIONS.map((pct, i) => (
        <Handle
          key={`left-${i}`}
          type="source"
          position={Position.Left}
          id={`${table.name}-left-${i}`}
          style={{ ...handleStyle, top: `${pct}%` }}
          isConnectable={true}
        />
      ))}

      <div
        style={{
          padding: '8px 12px',
          borderBottom: '1px solid #f0f0f0',
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          background: headerBg,
          borderRadius: '6px 6px 0 0',
        }}
      >
        {isRoot && <CrownOutlined style={{ color: aggregateColor?.border ?? '#1677ff', fontSize: 14 }} />}
        <span style={{ flex: 1 }}>{table.name}</span>
        {isRoot && (
          <Tag
            color={aggregateColor?.border ?? '#1677ff'}
            style={{ fontSize: 10, lineHeight: '16px', borderRadius: 10 }}
          >
            Root
          </Tag>
        )}
        {showRemove && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onRemoveFromAggregate();
            }}
            title="Remove from aggregate"
            style={{
              background: 'none',
              border: `1px solid ${borderColor}`,
              borderRadius: '50%',
              width: 18,
              height: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              padding: 0,
              color: borderColor,
              fontSize: 9,
              lineHeight: 1,
            }}
          >
            <CloseOutlined />
          </button>
        )}
      </div>

      <div style={{ padding: '4px 0' }}>
        {pkColumns.map((col: TableColumn) => (
          <div
            key={col.name}
            style={{ padding: '3px 12px', display: 'flex', alignItems: 'center', gap: 6 }}
          >
            <KeyOutlined style={{ color: '#faad14', fontSize: 11 }} />
            <span style={{ fontWeight: 500 }}>{col.name}</span>
            <Tag color="gold" style={{ fontSize: 11, marginLeft: 'auto', lineHeight: '16px' }}>
              {formatType(col)}
            </Tag>
          </div>
        ))}

        {regularColumns.map((col: TableColumn) => (
          <div
            key={col.name}
            style={{ padding: '3px 12px', display: 'flex', alignItems: 'center', gap: 6, color: '#595959' }}
          >
            {indexedColumns.has(col.name)
              ? <NodeIndexOutlined style={{ color: '#52c41a', fontSize: 11, width: 11 }} />
              : <span style={{ width: 11 }} />}
            <span>{col.name}</span>
            <Tag style={{ fontSize: 11, marginLeft: 'auto', lineHeight: '16px' }}>{formatType(col)}</Tag>
          </div>
        ))}
      </div>
    </div>
  );
}

function formatType(col: TableColumn): string {
  return col.typeValue ? `${col.typeName}(${col.typeValue})` : col.typeName;
}

export default memo(TableNode);
