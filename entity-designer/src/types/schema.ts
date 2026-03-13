/**
 * Pure JSON schema types for AggregateConfig and TableSchema.
 * No runtime values — only type definitions.
 *
 * This file is designed for external reuse (e.g., code generation tools,
 * frontend application scaffolding) without pulling in framework-specific constants.
 */

// ── TableSchema ──

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

// ── AggregateConfig ──

export type IdStrategy = 'IDENTITY' | 'SEQUENCE' | 'UUID' | 'AUTO' | 'NONE';

export type RelationType = 'OneToOne' | 'OneToMany' | 'ManyToOne';

export interface RelationDefinition {
  type: RelationType;
  target: string;
  joinColumn: string;
}

export interface ColumnOverride {
  enumType?: string;
}

export interface EntityMode {
  readOnly: boolean;
  searchable: boolean;
  revision: boolean;
}

export interface EntityDefinition {
  table: string;
  relations: RelationDefinition[];
  idStrategy: IdStrategy | null;
  columnOverrides?: Record<string, ColumnOverride>;
  entityMode?: EntityMode;
}

export interface AggregateDefinition {
  root: string;
  relations: RelationDefinition[];
  entities: EntityDefinition[];
  idStrategy: IdStrategy | null;
  columnOverrides?: Record<string, ColumnOverride>;
  entityMode?: EntityMode;
}

export interface AggregateConfig {
  basePackage: string;
  aggregates: AggregateDefinition[];
  idStrategy: IdStrategy;
  enums?: Record<string, string[]>;
  globalEngine?: string;
  globalCharset?: string;
  revisionSuffix?: string;
  tableSchema?: TableSchema;
}
