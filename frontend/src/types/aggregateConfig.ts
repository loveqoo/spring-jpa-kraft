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

export const TYPES_WITH_SIZE = new Set(['VARCHAR', 'CHAR', 'DECIMAL', 'FLOAT', 'DOUBLE']);

export type RelationType = 'OneToOne' | 'OneToMany' | 'ManyToOne';

export interface RelationDefinition {
  type: RelationType;
  target: string;
  joinColumn: string;
}

export interface EntityDefinition {
  table: string;
  relations: RelationDefinition[];
  idStrategy: IdStrategy | null;
}

export interface AggregateDefinition {
  root: string;
  relations: RelationDefinition[];
  entities: EntityDefinition[];
  idStrategy: IdStrategy | null;
}

export interface AggregateConfig {
  basePackage: string;
  aggregates: AggregateDefinition[];
  idStrategy: IdStrategy;
  tableSchema?: import('./tableSchema').TableSchema;
}
