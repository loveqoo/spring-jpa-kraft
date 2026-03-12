import { INVERSE_RELATION } from '../types/aggregateConfig';
import type { AggregateConfig, IdStrategy, RelationType, ColumnOverride, EntityMode } from '../types/aggregateConfig';
import type { TableSchema, TableColumn, TableIndex, TableDef } from '../types/tableSchema';
import { AUDIT_COLUMNS, AUDIT_COLUMN_NAMES, makeIdColumn, makeFkColumn, makeFkIndex } from '../types/tableSchema';

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
  enumDefinitions?: Record<string, string[]>;
  columnOverrides?: Record<string, Record<string, ColumnOverride>>;
  entityModes?: Record<string, EntityMode>;
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
    // Ensure every table has audit columns
    schema = {
      tables: config.tableSchema.tables.map((t) => ({
        ...t,
        columns: ensureAuditColumns(t.columns),
      })),
    };
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

      return { name, schema: null, columns: ensureAuditColumns(columns), indexes, engine: null, charset: null, comment: null };
    });
    schema = { tables };
  }

  // Extract column overrides from aggregates
  const columnOverrides: Record<string, Record<string, ColumnOverride>> = {};
  for (const agg of config.aggregates) {
    if (agg.columnOverrides && Object.keys(agg.columnOverrides).length > 0) {
      columnOverrides[agg.root] = agg.columnOverrides;
    }
    for (const entity of agg.entities) {
      if (entity.columnOverrides && Object.keys(entity.columnOverrides).length > 0) {
        columnOverrides[entity.table] = entity.columnOverrides;
      }
    }
  }

  // Extract entity modes from aggregates
  const entityModes: Record<string, EntityMode> = {};
  for (const agg of config.aggregates) {
    if (agg.entityMode) {
      entityModes[agg.root] = agg.entityMode;
    }
    for (const entity of agg.entities) {
      if (entity.entityMode) {
        entityModes[entity.table] = entity.entityMode;
      }
    }
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
      enumDefinitions: config.enums ?? {},
      columnOverrides,
      entityModes,
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
    targetRelationType: INVERSE_RELATION[sourceRelationType],
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

/**
 * Ensure audit columns exist at the end of the column list.
 * Skips any audit columns already present (dedup).
 */
function ensureAuditColumns(columns: TableColumn[]): TableColumn[] {
  const existing = new Set(columns.map((c) => c.name));
  const missing = AUDIT_COLUMNS.filter((c) => !existing.has(c.name));
  if (missing.length === 0) return columns;
  // Remove any misplaced audit columns and re-append at the end
  const withoutAudit = columns.filter((c) => !AUDIT_COLUMN_NAMES.has(c.name));
  const existingAudit = columns.filter((c) => AUDIT_COLUMN_NAMES.has(c.name));
  return [...withoutAudit, ...existingAudit, ...missing.map((c) => ({ ...c }))];
}
