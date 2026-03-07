import type { Edge, Node } from '@xyflow/react';
import type { TableDef } from '../types/tableSchema';
import { pickHandles } from './handlePicker';

export interface FkCandidate {
  sourceTable: string;
  column: string;
  targetTable: string;
}

export function detectFkCandidates(tables: TableDef[]): FkCandidate[] {
  const tableNames = new Set(tables.map((t) => t.name));
  const candidates: FkCandidate[] = [];

  for (const table of tables) {
    for (const col of table.columns) {
      if (!col.name.endsWith('_id')) continue;

      const prefix = col.name.slice(0, -3); // remove _id
      // Try exact match, then plural forms
      const possibleTargets = [prefix, prefix + 's', prefix + 'es'];
      const target = possibleTargets.find((t) => tableNames.has(t) && t !== table.name);

      if (target) {
        candidates.push({
          sourceTable: table.name,
          column: col.name,
          targetTable: target,
        });
      }
    }
  }

  return candidates;
}

export function candidatesToEdges(candidates: FkCandidate[], nodes: Node[]): Edge[] {
  const nodeMap = new Map(nodes.map((n) => [n.id, n]));

  return candidates.map((c) => {
    const sourceNode = nodeMap.get(c.sourceTable);
    const targetNode = nodeMap.get(c.targetTable);

    const handles =
      sourceNode && targetNode
        ? pickHandles(sourceNode, targetNode)
        : { sourceHandle: `${c.sourceTable}-right-1`, targetHandle: `${c.targetTable}-left-1` };

    return {
      id: `fk-${c.sourceTable}-${c.column}-${c.targetTable}`,
      source: c.sourceTable,
      target: c.targetTable,
      sourceHandle: handles.sourceHandle,
      targetHandle: handles.targetHandle,
      type: 'relationEdge',
      animated: true,
      data: {
        joinColumn: c.column,
        sourceRelationType: 'ManyToOne' as const,
        targetRelationType: 'OneToMany' as const,
        confirmed: false,
      },
    };
  });
}
