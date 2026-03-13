export type { TableSchema, TableDef, TableColumn, TableIndex } from './schema';
import type { TableColumn, TableIndex } from './schema';

/** System audit columns — always appended to every table (from BaseEntity / Traceable) */
export const AUDIT_COLUMNS: TableColumn[] = [
  { name: 'created_at', typeName: 'DATETIME', typeValue: null, primaryKey: false, notNull: false, unique: false, autoIncrement: false, defaultValue: null, note: null },
  { name: 'created_by', typeName: 'VARCHAR', typeValue: 100, primaryKey: false, notNull: false, unique: false, autoIncrement: false, defaultValue: null, note: null },
  { name: 'updated_at', typeName: 'DATETIME', typeValue: null, primaryKey: false, notNull: false, unique: false, autoIncrement: false, defaultValue: null, note: null },
  { name: 'updated_by', typeName: 'VARCHAR', typeValue: 100, primaryKey: false, notNull: false, unique: false, autoIncrement: false, defaultValue: null, note: null },
];

export const AUDIT_COLUMN_NAMES = new Set(AUDIT_COLUMNS.map((c) => c.name));

export function makeIdColumn(): TableColumn {
  return {
    name: 'id',
    typeName: 'BIGINT',
    typeValue: null,
    primaryKey: true,
    notNull: true,
    unique: false,
    autoIncrement: true,
    defaultValue: null,
    note: null,
  };
}

export function makeFkColumn(name: string): TableColumn {
  return {
    name,
    typeName: 'BIGINT',
    typeValue: null,
    primaryKey: false,
    notNull: true,
    unique: false,
    autoIncrement: false,
    defaultValue: null,
    note: null,
  };
}

export function makeFkIndex(columnName: string): TableIndex {
  return {
    name: `idx_${columnName}`,
    columns: [columnName],
    unique: false,
    primaryKey: false,
  };
}
