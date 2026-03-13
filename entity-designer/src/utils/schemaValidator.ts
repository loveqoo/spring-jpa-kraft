import type { Edge } from '@xyflow/react';
import type { TableSchema } from '../types/tableSchema';

export interface ValidationError {
  severity: 'error' | 'warning';
  messageKey: string;
  messageParams?: Record<string, string>;
  target?: { type: 'table' | 'edge'; id: string };
}

interface ValidatorInput {
  schema: TableSchema;
  edges: Edge[];
}

export function validateSchema({ schema, edges }: ValidatorInput): ValidationError[] {
  const errors: ValidationError[] = [];
  const tableMap = new Map(schema.tables.map((t) => [t.name, t]));

  // Rule 4: Table without PK
  for (const table of schema.tables) {
    const hasPk = table.columns.some((c) => c.primaryKey);
    if (!hasPk) {
      errors.push({
        severity: 'error',
        messageKey: 'validation.noPrimaryKey',
        messageParams: { table: table.name },
        target: { type: 'table', id: table.name },
      });
    }
  }

  for (const edge of edges) {
    const data = edge.data as Record<string, unknown> | undefined;
    const confirmed = data?.confirmed as boolean | undefined;
    const joinColumn = data?.joinColumn as string | undefined;

    // Rule 5: Unconfirmed edge
    if (!confirmed) {
      errors.push({
        severity: 'warning',
        messageKey: 'validation.unconfirmedRelation',
        messageParams: { source: edge.source, target: edge.target },
        target: { type: 'edge', id: edge.id },
      });
      continue;
    }

    // Rule 1: Confirmed edge with empty joinColumn
    if (!joinColumn) {
      errors.push({
        severity: 'error',
        messageKey: 'validation.noJoinColumn',
        messageParams: { source: edge.source, target: edge.target },
        target: { type: 'edge', id: edge.id },
      });
      continue;
    }

    // Determine FK side: the Many side holds the FK
    const sourceRel = data?.sourceRelationType as string | undefined;
    const fkTableName = sourceRel === 'ManyToOne' || sourceRel === 'OneToOne' ? edge.source : edge.target;
    const fkTable = tableMap.get(fkTableName);

    // Rule 2: joinColumn does not exist in FK table
    if (fkTable) {
      const colExists = fkTable.columns.some((c) => c.name === joinColumn);
      if (!colExists) {
        errors.push({
          severity: 'error',
          messageKey: 'validation.joinColumnNotExist',
          messageParams: { column: joinColumn, table: fkTableName },
          target: { type: 'edge', id: edge.id },
        });
      } else {
        // Rule 3: FK column has no index
        const hasIndex = fkTable.indexes.some((idx) => idx.columns.includes(joinColumn));
        if (!hasIndex) {
          errors.push({
            severity: 'warning',
            messageKey: 'validation.noIndexOnFk',
            messageParams: { column: joinColumn, table: fkTableName },
            target: { type: 'edge', id: edge.id },
          });
        }
      }
    }
  }

  // Rule 6: Index references non-existent column
  for (const table of schema.tables) {
    const colNames = new Set(table.columns.map((c) => c.name));
    for (const idx of table.indexes) {
      for (const col of idx.columns) {
        if (!colNames.has(col)) {
          errors.push({
            severity: 'error',
            messageKey: 'validation.indexRefNonExistent',
            messageParams: { index: idx.name ?? '(unnamed)', table: table.name, column: col },
            target: { type: 'table', id: table.name },
          });
        }
      }
    }
  }

  return errors;
}
