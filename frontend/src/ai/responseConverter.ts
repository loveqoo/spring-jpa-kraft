import type { AggregateConfig, RelationDefinition } from '../types/aggregateConfig';
import type { TableDef, TableColumn, TableIndex } from '../types/tableSchema';
import { AUDIT_COLUMNS, AUDIT_COLUMN_NAMES, makeIdColumn, makeFkColumn, makeFkIndex } from '../types/tableSchema';

/**
 * Simplified AI response format — easy for small models to generate.
 */
export interface SimpleSchemaResponse {
  tables: Array<{
    name: string;
    columns: string[]; // e.g. "column_name TYPE(size)"
  }>;
  relationships: Array<{
    parent: string;
    child: string;
  }>;
  basePackage?: string;
}

/**
 * Delta modification response — only changes, not the full schema.
 */
export interface DeltaResponse {
  add_tables?: Array<{
    name: string;
    columns: string[];
  }>;
  remove_tables?: string[];
  add_columns?: Array<{
    table: string;
    columns: string[];
  }>;
  remove_columns?: Array<{
    table: string;
    columns: string[];
  }>;
  add_relationships?: Array<{
    parent: string;
    child: string;
  }>;
  remove_relationships?: Array<{
    parent: string;
    child: string;
  }>;
}

/**
 * Apply a delta response to an existing AggregateConfig, producing a new SimpleSchemaResponse
 * that can be fed to convertSimpleToConfig.
 */
export function applyDelta(currentConfig: AggregateConfig, delta: DeltaResponse): SimpleSchemaResponse {
  const removeSet = new Set(delta.remove_tables ?? []);

  // Build column add/remove maps for existing table modifications
  const colsToAdd = new Map<string, string[]>();
  for (const entry of delta.add_columns ?? []) {
    colsToAdd.set(entry.table, entry.columns);
  }
  const colsToRemove = new Map<string, Set<string>>();
  for (const entry of delta.remove_columns ?? []) {
    colsToRemove.set(entry.table, new Set(entry.columns.map((c) => c.trim().split(/\s+/)[0].toLowerCase())));
  }

  // Existing tables (minus removed ones), converted to simple format
  const existingTables = (currentConfig.tableSchema?.tables ?? [])
    .filter((t) => !removeSet.has(t.name))
    .map((t) => {
      const removeColSet = colsToRemove.get(t.name);
      let columns = t.columns
        .filter((c) => !c.primaryKey)
        .filter((c) => !AUDIT_COLUMN_NAMES.has(c.name))
        .filter((c) => !removeColSet || !removeColSet.has(c.name))
        .map((c) => `${c.name} ${c.typeName}${c.typeValue ? `(${c.typeValue})` : ''}${c.notNull ? ' NOT NULL' : ''}`);

      // Append new columns
      const addCols = colsToAdd.get(t.name);
      if (addCols) columns = [...columns, ...addCols];

      return { name: t.name, columns };
    });

  // Add new tables
  const newTables = delta.add_tables ?? [];
  const tables = [...existingTables, ...newTables];

  // Final table names — used to validate relationships
  const finalTableNames = new Set(tables.map((t) => t.name));

  // Existing relationships (minus explicitly removed ones)
  const removeRelKey = new Set(
    (delta.remove_relationships ?? []).map((r) => `${r.parent}::${r.child}`),
  );
  const existingRels = currentConfig.aggregates.flatMap((agg) =>
    agg.relations
      .filter((r) => r.type === 'OneToMany')
      .map((r) => ({ parent: agg.root, child: r.target })),
  ).filter((r) => !removeRelKey.has(`${r.parent}::${r.child}`));

  // Keep relationships only if both tables exist in the final set
  const validRels = existingRels.filter((r) => finalTableNames.has(r.parent) && finalTableNames.has(r.child));

  // Add new relationships
  const relationships = [...validRels, ...(delta.add_relationships ?? [])];

  return {
    tables,
    relationships,
    basePackage: currentConfig.basePackage,
  };
}

/**
 * Apply a filtered delta directly to an existing AggregateConfig,
 * preserving existing indexes, column details, and table structure.
 * Unlike applyDelta → convertSimpleToConfig, this does not rebuild from scratch.
 */
export function applyDeltaToConfig(config: AggregateConfig, delta: DeltaResponse): AggregateConfig {
  const existingTables = [...(config.tableSchema?.tables ?? [])].map((t) => ({
    ...t,
    columns: [...t.columns],
    indexes: [...t.indexes],
  }));

  // Remove tables
  const removeSet = new Set(delta.remove_tables ?? []);
  let tables = existingTables.filter((t) => !removeSet.has(t.name));

  // Add columns to existing tables
  for (const entry of delta.add_columns ?? []) {
    const table = tables.find((t) => t.name === entry.table);
    if (!table) continue;
    for (const colStr of entry.columns) {
      const parsed = parseColumnDef(colStr);
      // Skip if column already exists
      if (table.columns.some((c) => c.name === parsed.name)) continue;
      // Insert before audit columns
      const auditIdx = table.columns.findIndex((c) => AUDIT_COLUMN_NAMES.has(c.name));
      if (auditIdx >= 0) {
        table.columns.splice(auditIdx, 0, parsed);
      } else {
        table.columns.push(parsed);
      }
    }
  }

  // Remove columns from existing tables
  for (const entry of delta.remove_columns ?? []) {
    const table = tables.find((t) => t.name === entry.table);
    if (!table) continue;
    // Extract just the column name (first word) in case the model includes type info
    const removeCols = new Set(entry.columns.map((c) => c.trim().split(/\s+/)[0].toLowerCase()));
    table.columns = table.columns.filter((c) => !removeCols.has(c.name));
    // Also remove indexes that reference removed columns
    table.indexes = table.indexes.filter(
      (idx) => !idx.columns.some((col) => removeCols.has(col)),
    );
  }

  // Add new tables
  for (const newTable of delta.add_tables ?? []) {
    if (tables.some((t) => t.name === newTable.name)) continue;
    const columns: TableColumn[] = [makeIdColumn()];
    for (const colStr of newTable.columns) {
      const parsed = parseColumnDef(colStr);
      if (parsed.name !== 'id') columns.push(parsed);
    }
    columns.push(...AUDIT_COLUMNS.map((c) => ({ ...c })));
    tables.push({
      name: newTable.name, schema: null, columns, indexes: [],
      engine: null, charset: null, comment: null,
    });
  }

  // Rebuild aggregates
  let aggregates = [...config.aggregates];

  // Remove relationships
  for (const rel of delta.remove_relationships ?? []) {
    aggregates = aggregates.map((agg) => ({
      ...agg,
      relations: agg.relations.filter(
        (r) => !(r.type === 'OneToMany' && agg.root === rel.parent && r.target === rel.child),
      ),
      entities: agg.entities.filter(
        (e) => !(e.table === rel.child && agg.root === rel.parent),
      ),
    }));
  }

  // Remove aggregates for removed tables
  aggregates = aggregates.filter((agg) => !removeSet.has(agg.root));
  aggregates = aggregates.map((agg) => ({
    ...agg,
    relations: agg.relations.filter((r) => !removeSet.has(r.target)),
    entities: agg.entities.filter((e) => !removeSet.has(e.table)),
  }));

  // Add relationships
  for (const rel of delta.add_relationships ?? []) {
    const parentAgg = aggregates.find((agg) => agg.root === rel.parent);
    if (parentAgg) {
      const fkCol = `${rel.parent}_id`;
      // Add OneToMany on parent
      if (!parentAgg.relations.some((r) => r.target === rel.child)) {
        parentAgg.relations.push({ type: 'OneToMany', target: rel.child, joinColumn: fkCol });
      }
      // Add entity with ManyToOne
      if (!parentAgg.entities.some((e) => e.table === rel.child)) {
        parentAgg.entities.push({
          table: rel.child,
          idStrategy: null,
          relations: [{ type: 'ManyToOne', target: rel.parent, joinColumn: fkCol }],
        });
      }
      // Add FK column to child table if missing
      const childTable = tables.find((t) => t.name === rel.child);
      if (childTable && !childTable.columns.some((c) => c.name === fkCol)) {
        const idIdx = childTable.columns.findIndex((c) => c.primaryKey);
        childTable.columns.splice(idIdx + 1, 0, makeFkColumn(fkCol));
        childTable.indexes.push(makeFkIndex(fkCol));
      }
    }
  }

  // Add standalone aggregates for new tables not assigned to any parent
  const allChildTables = new Set(aggregates.flatMap((agg) => agg.entities.map((e) => e.table)));
  const allRoots = new Set(aggregates.map((agg) => agg.root));
  for (const newTable of delta.add_tables ?? []) {
    if (!allChildTables.has(newTable.name) && !allRoots.has(newTable.name)) {
      aggregates.push({
        root: newTable.name,
        idStrategy: null,
        relations: [],
        entities: [],
      });
    }
  }

  return {
    ...config,
    aggregates,
    tableSchema: { tables },
  };
}

/**
 * Normalize AI response: split comma-joined columns, filter invalid relationships.
 */
function normalizeSimpleResponse(simple: SimpleSchemaResponse): SimpleSchemaResponse {
  const tableNames = new Set(simple.tables.map((t) => t.name));

  // Split columns that may be comma-joined in a single string
  const tables = simple.tables.map((t) => {
    const expanded: string[] = [];
    for (const col of t.columns) {
      if (col.includes(',') && col.split(',').every((s) => s.trim().split(/\s+/).length >= 2)) {
        expanded.push(...col.split(',').map((s) => s.trim()).filter(Boolean));
      } else {
        expanded.push(col);
      }
    }
    return { ...t, columns: expanded };
  });

  // Filter relationships: both parent and child must be valid table names
  const relationships = (simple.relationships ?? []).filter(
    (r) => tableNames.has(r.parent) && tableNames.has(r.child),
  );

  return { ...simple, tables, relationships };
}

/**
 * Convert a simplified AI response into a full AggregateConfig.
 */
export function convertSimpleToConfig(raw: SimpleSchemaResponse): AggregateConfig {
  const simple = normalizeSimpleResponse(raw);

  // Determine roots: tables that appear as parent but figure out aggregate grouping
  const childSet = new Set(simple.relationships.map((r) => r.child));
  const roots = simple.tables.map((t) => t.name).filter((name) => !childSet.has(name));
  // If no relationships, every table is its own root
  if (roots.length === 0) {
    for (const t of simple.tables) roots.push(t.name);
  }

  // Build parent→children map
  const childrenOf = new Map<string, string[]>();
  for (const rel of simple.relationships) {
    if (!childrenOf.has(rel.parent)) childrenOf.set(rel.parent, []);
    childrenOf.get(rel.parent)!.push(rel.child);
  }

  // Build aggregates
  const aggregates = roots.map((root) => {
    const children = childrenOf.get(root) ?? [];
    const fkCol = `${root}_id`;

    const rootRelations: RelationDefinition[] = children.map((child) => ({
      type: 'OneToMany' as const,
      target: child,
      joinColumn: fkCol,
    }));

    const entities = children.map((child) => ({
      table: child,
      idStrategy: null,
      relations: [
        {
          type: 'ManyToOne' as const,
          target: root,
          joinColumn: fkCol,
        },
      ],
    }));

    return {
      root,
      idStrategy: null,
      relations: rootRelations,
      entities,
    };
  });

  // Build tableSchema
  const tables: TableDef[] = simple.tables.map((t) => {
    const isChild = childSet.has(t.name);
    const parentRel = simple.relationships.find((r) => r.child === t.name);

    const columns: TableColumn[] = [makeIdColumn()];

    // FK column if child
    if (isChild && parentRel) {
      const fkName = `${parentRel.parent}_id`;
      // Skip if already in AI columns
      if (!t.columns.some((c) => parseColumnDef(c).name === fkName)) {
        columns.push(makeFkColumn(fkName));
      }
    }

    // Business columns from AI
    for (const colStr of t.columns) {
      const parsed = parseColumnDef(colStr);
      // Skip if it's the FK column we already added, or id column
      if (parsed.name === 'id') continue;
      if (isChild && parentRel && parsed.name === `${parentRel.parent}_id`) continue;
      columns.push(parsed);
    }

    // Audit columns
    columns.push(...AUDIT_COLUMNS.map((c) => ({ ...c })));

    // Indexes for FK columns
    const indexes: TableIndex[] = [];
    if (isChild && parentRel) {
      indexes.push(makeFkIndex(`${parentRel.parent}_id`));
    }

    return { name: t.name, schema: null, columns, indexes, engine: null, charset: null, comment: null };
  });

  return {
    basePackage: simple.basePackage ?? 'com.example',
    idStrategy: 'IDENTITY',
    globalEngine: 'InnoDB',
    globalCharset: 'utf8mb4',
    aggregates,
    tableSchema: { tables },
  };
}

/**
 * Parse a column definition string like "column_name TYPE(size)" into a TableColumn.
 */
function parseColumnDef(colStr: string): TableColumn {
  // Examples: "name VARCHAR(255)", "status VARCHAR(20)", "is_control BOOLEAN", "amount DECIMAL(10,2)"
  const trimmed = colStr.trim();
  const parts = trimmed.split(/\s+/);
  const name = parts[0]?.toLowerCase() ?? '';

  let typeName = 'VARCHAR';
  let typeValue: number | null = 255;
  let notNull = false;

  if (parts.length >= 2) {
    const typeStr = parts[1].toUpperCase();
    const typeMatch = typeStr.match(/^([A-Z]+)(?:\((\d+)(?:,\d+)?\))?$/);
    if (typeMatch) {
      typeName = normalizeType(typeMatch[1]);
      typeValue = typeMatch[2] ? parseInt(typeMatch[2], 10) : null;
    } else {
      typeName = normalizeType(typeStr);
      typeValue = null;
    }
  }

  // Check for NOT NULL in remaining parts
  const rest = parts.slice(2).join(' ').toUpperCase();
  if (rest.includes('NOT NULL')) notNull = true;

  return {
    name,
    typeName,
    typeValue,
    primaryKey: false,
    notNull,
    unique: false,
    autoIncrement: false,
    defaultValue: null,
    note: null,
  };
}

const TYPE_ALIASES: Record<string, string> = {
  INT: 'INT',
  INTEGER: 'INT',
  BIGINT: 'BIGINT',
  SMALLINT: 'SMALLINT',
  TINYINT: 'TINYINT',
  VARCHAR: 'VARCHAR',
  CHAR: 'CHAR',
  TEXT: 'TEXT',
  LONGTEXT: 'LONGTEXT',
  DECIMAL: 'DECIMAL',
  FLOAT: 'FLOAT',
  DOUBLE: 'DOUBLE',
  BOOLEAN: 'BOOLEAN',
  BOOL: 'BOOLEAN',
  TIMESTAMP: 'TIMESTAMP',
  DATETIME: 'DATETIME',
  DATE: 'DATE',
  TIME: 'TIME',
  BLOB: 'BLOB',
  JSON: 'JSON',
  ENUM: 'VARCHAR', // ENUM → VARCHAR fallback
};

function normalizeType(raw: string): string {
  return TYPE_ALIASES[raw] ?? 'VARCHAR';
}
