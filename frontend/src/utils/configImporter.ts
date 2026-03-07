import type { AggregateConfig, IdStrategy, RelationType } from '../types/aggregateConfig';
import type { TableSchema, TableColumn, TableDef, TableIndex } from '../types/tableSchema';

export interface InitialOverrides {
  basePackage: string;
  globalIdStrategy: IdStrategy;
  globalEngine: string;
  globalCharset: string;
  roots: string[];
  aggregateAssignments: Record<string, string>;
  nodeIdStrategies: Record<string, IdStrategy | null>;
  edgeDefinitions: Array<{
    source: string;
    target: string;
    sourceRelationType: RelationType;
    targetRelationType: RelationType;
    joinColumn: string;
  }>;
}

const INVERSE: Record<RelationType, RelationType> = {
  OneToMany: 'ManyToOne',
  ManyToOne: 'OneToMany',
  OneToOne: 'OneToOne',
};

function makeIdColumn(): TableColumn {
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

function makeFkColumn(name: string): TableColumn {
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

function makeFkIndex(columnName: string): TableIndex {
  return {
    name: `idx_${columnName}`,
    columns: [columnName],
    unique: false,
    primaryKey: false,
  };
}

/**
 * Validate that the input looks like a valid AggregateConfig.
 */
function validateConfig(config: unknown): asserts config is AggregateConfig {
  if (typeof config !== 'object' || config === null) {
    throw new Error('Invalid config: expected an object');
  }
  const obj = config as Record<string, unknown>;
  if (!Array.isArray(obj.aggregates)) {
    throw new Error('Invalid config: "aggregates" array is required');
  }
  for (let i = 0; i < obj.aggregates.length; i++) {
    const agg = obj.aggregates[i] as Record<string, unknown>;
    if (!agg.root || typeof agg.root !== 'string') {
      throw new Error(`Invalid config: aggregates[${i}] must have a "root" string field`);
    }
  }
}

/**
 * Import an AggregateConfig JSON and produce TableSchema + overrides
 * that can reconstruct the Designer state.
 *
 * If the config contains an embedded `tableSchema`, it is used directly.
 * Otherwise, a minimal schema is reconstructed from relation info.
 */
export function importAggregateConfig(raw: unknown): {
  schema: TableSchema;
  overrides: InitialOverrides;
} {
  validateConfig(raw);
  const config = raw as AggregateConfig;

  // Collect all table names and FK columns per table
  const fkColumns = new Map<string, Set<string>>(); // tableName → set of FK column names
  const tableNames = new Set<string>();

  const roots: string[] = [];
  const aggregateAssignments: Record<string, string> = {};
  const nodeIdStrategies: Record<string, IdStrategy | null> = {};
  const edgeDefinitions: InitialOverrides['edgeDefinitions'] = [];

  for (const agg of config.aggregates) {
    const rootName = agg.root;
    roots.push(rootName);
    tableNames.add(rootName);

    if (agg.idStrategy) {
      nodeIdStrategies[rootName] = agg.idStrategy;
    }

    // Root relations
    for (const rel of agg.relations) {
      tableNames.add(rel.target);
      addEdgeDefinition(edgeDefinitions, rootName, rel.target, rel.type, rel.joinColumn);
      trackFkColumn(fkColumns, rootName, rel.target, rel.type, rel.joinColumn);
    }

    // Entity relations
    for (const entity of agg.entities) {
      tableNames.add(entity.table);
      aggregateAssignments[entity.table] = rootName;

      if (entity.idStrategy) {
        nodeIdStrategies[entity.table] = entity.idStrategy;
      }

      for (const rel of entity.relations) {
        // Skip reverse edges (already added from the other side)
        if (isReverseEdgeAlreadyAdded(edgeDefinitions, entity.table, rel.target)) continue;
        addEdgeDefinition(edgeDefinitions, entity.table, rel.target, rel.type, rel.joinColumn);
        trackFkColumn(fkColumns, entity.table, rel.target, rel.type, rel.joinColumn);
      }
    }
  }

  // Use embedded tableSchema if available, otherwise reconstruct minimal schema
  let schema: TableSchema;
  if (config.tableSchema && Array.isArray(config.tableSchema.tables)) {
    schema = config.tableSchema;
  } else {
    const tables: TableDef[] = Array.from(tableNames).map((name) => {
      const columns: TableColumn[] = [makeIdColumn()];
      const indexes: TableIndex[] = [];

      const fks = fkColumns.get(name);
      if (fks) {
        for (const fkCol of fks) {
          columns.push(makeFkColumn(fkCol));
          indexes.push(makeFkIndex(fkCol));
        }
      }

      return { name, schema: null, columns, indexes, engine: null, charset: null, comment: null };
    });
    schema = { tables };
  }

  return {
    schema,
    overrides: {
      basePackage: config.basePackage,
      globalIdStrategy: config.idStrategy,
      globalEngine: config.globalEngine ?? 'InnoDB',
      globalCharset: config.globalCharset ?? 'utf8mb4',
      roots,
      aggregateAssignments,
      nodeIdStrategies,
      edgeDefinitions,
    },
  };
}

function addEdgeDefinition(
  edges: InitialOverrides['edgeDefinitions'],
  source: string,
  target: string,
  sourceRelationType: RelationType,
  joinColumn: string,
) {
  edges.push({
    source,
    target,
    sourceRelationType,
    targetRelationType: INVERSE[sourceRelationType],
    joinColumn,
  });
}

function isReverseEdgeAlreadyAdded(
  edges: InitialOverrides['edgeDefinitions'],
  source: string,
  target: string,
): boolean {
  return edges.some(
    (e) =>
      (e.source === target && e.target === source) || (e.source === source && e.target === target),
  );
}

/**
 * Determine which table holds the FK column based on the relation type,
 * and track it for schema reconstruction.
 */
function trackFkColumn(
  fkColumns: Map<string, Set<string>>,
  source: string,
  target: string,
  relationType: RelationType,
  joinColumn: string,
) {
  if (!joinColumn) return;

  // FK goes on the "many" side or the "owning" side
  const fkTable = relationType === 'ManyToOne' || relationType === 'OneToOne' ? source : target;

  if (!fkColumns.has(fkTable)) {
    fkColumns.set(fkTable, new Set());
  }
  fkColumns.get(fkTable)!.add(joinColumn);
}
