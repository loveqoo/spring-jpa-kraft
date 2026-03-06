import type { TableSchema, TableDef } from '../types/tableSchema';

export function parseTableSchema(json: string): TableSchema {
  const parsed = JSON.parse(json);

  if (!parsed || !Array.isArray(parsed.tables)) {
    throw new Error('Invalid TableSchema: "tables" array is required');
  }

  for (const table of parsed.tables) {
    validateTableDef(table);
  }

  return parsed as TableSchema;
}

function validateTableDef(table: unknown): asserts table is TableDef {
  if (!table || typeof table !== 'object') {
    throw new Error('Invalid TableDef: must be an object');
  }

  const t = table as Record<string, unknown>;

  if (typeof t.name !== 'string' || t.name.trim() === '') {
    throw new Error('Invalid TableDef: "name" string is required');
  }

  if (!Array.isArray(t.columns)) {
    throw new Error(`Invalid TableDef "${t.name}": "columns" array is required`);
  }

  for (const col of t.columns) {
    if (!col || typeof col !== 'object' || typeof (col as Record<string, unknown>).name !== 'string') {
      throw new Error(`Invalid column in table "${t.name}": each column must have a "name"`);
    }
  }
}
