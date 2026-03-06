import type { Node } from '@xyflow/react';
import type { TableDef } from '../types/tableSchema';

const NODE_WIDTH = 260;
const NODE_HEIGHT_BASE = 80;
const NODE_HEIGHT_PER_COLUMN = 24;
const GAP_X = 60;
const GAP_Y = 40;
const COLUMNS_PER_ROW = 3;

export function layoutNodes(tables: TableDef[]): Node[] {
  return tables.map((table, index) => {
    const col = index % COLUMNS_PER_ROW;
    const row = Math.floor(index / COLUMNS_PER_ROW);
    const prevRowMaxHeight = getMaxHeightInRows(tables, row);

    return {
      id: table.name,
      type: 'tableNode',
      position: {
        x: col * (NODE_WIDTH + GAP_X),
        y: prevRowMaxHeight,
      },
      data: { table },
    };
  });
}

function getMaxHeightInRows(tables: TableDef[], targetRow: number): number {
  let y = 0;
  for (let row = 0; row < targetRow; row++) {
    let maxHeight = 0;
    for (let col = 0; col < COLUMNS_PER_ROW; col++) {
      const idx = row * COLUMNS_PER_ROW + col;
      if (idx < tables.length) {
        const h = NODE_HEIGHT_BASE + tables[idx].columns.length * NODE_HEIGHT_PER_COLUMN;
        maxHeight = Math.max(maxHeight, h);
      }
    }
    y += maxHeight + GAP_Y;
  }
  return y;
}
