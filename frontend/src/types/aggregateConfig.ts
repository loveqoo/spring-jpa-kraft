export type IdStrategy = 'IDENTITY' | 'SEQUENCE' | 'UUID' | 'AUTO' | 'NONE';

export const ID_STRATEGIES: IdStrategy[] = ['IDENTITY', 'SEQUENCE', 'UUID', 'AUTO', 'NONE'];

export const COLUMN_TYPES = [
  'BIGINT', 'INT', 'SMALLINT', 'TINYINT',
  'VARCHAR', 'CHAR', 'TEXT', 'LONGTEXT',
  'DECIMAL', 'FLOAT', 'DOUBLE',
  'BOOLEAN',
  'TIMESTAMP', 'DATETIME', 'DATE', 'TIME',
  'BLOB', 'JSON',
] as const;

export const TYPES_WITH_SIZE = new Set(['BIGINT', 'INT', 'SMALLINT', 'TINYINT', 'VARCHAR', 'CHAR', 'DECIMAL', 'FLOAT', 'DOUBLE']);

export const ENGINES = ['InnoDB', 'MyISAM', 'MEMORY', 'CSV', 'ARCHIVE'] as const;

export const CHARSETS = ['utf8mb4', 'utf8', 'latin1', 'ascii', 'binary'] as const;

export type RelationType = 'OneToOne' | 'OneToMany' | 'ManyToOne';

export const INVERSE_RELATION: Record<RelationType, RelationType> = {
  OneToMany: 'ManyToOne',
  ManyToOne: 'OneToMany',
  OneToOne: 'OneToOne',
};

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

export const DEFAULT_ENTITY_MODE: EntityMode = {
  readOnly: false,
  searchable: true,
  revision: false,
};

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
  tableSchema?: import('./tableSchema').TableSchema;
}
