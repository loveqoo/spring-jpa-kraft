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
