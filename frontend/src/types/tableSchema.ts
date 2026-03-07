export interface TableSchema {
  tables: TableDef[];
}

export interface TableDef {
  name: string;
  schema: string | null;
  columns: TableColumn[];
  indexes: TableIndex[];
  engine: string | null;
  charset: string | null;
  comment: string | null;
}

export interface TableColumn {
  name: string;
  typeName: string;
  typeValue: number | null;
  primaryKey: boolean;
  notNull: boolean;
  unique: boolean;
  autoIncrement: boolean;
  defaultValue: string | null;
  note: string | null;
}

export interface TableIndex {
  name: string | null;
  columns: string[];
  unique: boolean;
  primaryKey: boolean;
}

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
