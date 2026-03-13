export type {
  IdStrategy,
  RelationType,
  RelationDefinition,
  ColumnOverride,
  EntityMode,
  EntityDefinition,
  AggregateDefinition,
  AggregateConfig,
} from './schema';
import type { IdStrategy, RelationType, EntityMode } from './schema';

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

export const INVERSE_RELATION: Record<RelationType, RelationType> = {
  OneToMany: 'ManyToOne',
  ManyToOne: 'OneToMany',
  OneToOne: 'OneToOne',
};

export const DEFAULT_ENTITY_MODE: EntityMode = {
  readOnly: false,
  searchable: true,
  revision: false,
};
