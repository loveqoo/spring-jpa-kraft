import type { TableSchema, TableDef, TableColumn } from '../types/tableSchema';
import type { EntityMode } from '../types/aggregateConfig';
import { AUDIT_COLUMN_NAMES } from '../types/tableSchema';

function escapeIdentifier(name: string): string {
  return `\`${name}\``;
}

function columnDDL(col: TableColumn): string {
  let def = `  ${escapeIdentifier(col.name)} ${col.typeName.toUpperCase()}`;
  if (col.typeValue != null) {
    def += `(${col.typeValue})`;
  }
  if (col.notNull) {
    def += ' NOT NULL';
  }
  if (col.autoIncrement) {
    def += ' AUTO_INCREMENT';
  }
  if (col.defaultValue != null) {
    def += ` DEFAULT ${col.defaultValue}`;
  }
  if (col.note) {
    def += ` COMMENT '${col.note.replace(/'/g, "\\'")}'`;
  }
  return def;
}

function tableDDL(table: TableDef, globalEngine: string, globalCharset: string): string {
  const lines: string[] = [];

  for (const col of table.columns) {
    lines.push(columnDDL(col));
  }

  // Primary key
  const pkCols = table.columns.filter((c) => c.primaryKey);
  if (pkCols.length > 0) {
    lines.push(`  PRIMARY KEY (${pkCols.map((c) => escapeIdentifier(c.name)).join(', ')})`);
  }

  // Unique constraints from columns
  for (const col of table.columns) {
    if (col.unique && !col.primaryKey) {
      lines.push(`  UNIQUE KEY ${escapeIdentifier(`uk_${col.name}`)} (${escapeIdentifier(col.name)})`);
    }
  }

  // Indexes
  for (const idx of table.indexes) {
    if (idx.primaryKey) continue;
    const colList = idx.columns.map((c) => escapeIdentifier(c)).join(', ');
    const idxName = idx.name ?? `idx_${idx.columns.join('_')}`;
    if (idx.unique) {
      lines.push(`  UNIQUE KEY ${escapeIdentifier(idxName)} (${colList})`);
    } else {
      lines.push(`  KEY ${escapeIdentifier(idxName)} (${colList})`);
    }
  }

  let ddl = `CREATE TABLE ${escapeIdentifier(table.name)} (\n${lines.join(',\n')}\n)`;

  const engine = table.engine ?? globalEngine;
  const charset = table.charset ?? globalCharset;
  if (engine) ddl += ` ENGINE=${engine}`;
  if (charset) ddl += ` DEFAULT CHARSET=${charset}`;
  if (table.comment) ddl += ` COMMENT='${table.comment.replace(/'/g, "\\'")}'`;
  ddl += ';';
  return ddl;
}

function revinfoDDL(globalEngine: string, globalCharset: string): string {
  const lines = [
    '  `rev` INT NOT NULL AUTO_INCREMENT',
    '  `revtstmp` BIGINT',
    '  PRIMARY KEY (`rev`)',
  ];
  let ddl = `CREATE TABLE \`revinfo\` (\n${lines.join(',\n')}\n)`;
  if (globalEngine) ddl += ` ENGINE=${globalEngine}`;
  if (globalCharset) ddl += ` DEFAULT CHARSET=${globalCharset}`;
  ddl += " COMMENT='Hibernate Envers revision tracking';";
  return ddl;
}

function auditTableDDL(
  table: TableDef,
  suffix: string,
  globalEngine: string,
  globalCharset: string,
): string {
  const audName = `${table.name}${suffix}`;
  const lines: string[] = [];

  // Copy data columns (excluding audit columns like created_at etc.)
  for (const col of table.columns) {
    if (AUDIT_COLUMN_NAMES.has(col.name)) continue;
    // Audit table columns are all nullable except PK parts
    const nullable = col.primaryKey ? '' : '';
    let def = `  ${escapeIdentifier(col.name)} ${col.typeName.toUpperCase()}`;
    if (col.typeValue != null) def += `(${col.typeValue})`;
    if (col.primaryKey) def += ' NOT NULL';
    def += nullable;
    lines.push(def);
  }

  // Envers columns
  lines.push('  `rev` INT NOT NULL');
  lines.push("  `revtype` TINYINT COMMENT '0=ADD, 1=MOD, 2=DEL'");

  // Composite PK: original PK + rev
  const pkCols = table.columns.filter((c) => c.primaryKey);
  const pkNames = [...pkCols.map((c) => escapeIdentifier(c.name)), '`rev`'];
  lines.push(`  PRIMARY KEY (${pkNames.join(', ')})`);

  // FK to revinfo
  lines.push('  KEY `idx_rev` (`rev`)');

  let ddl = `CREATE TABLE ${escapeIdentifier(audName)} (\n${lines.join(',\n')}\n)`;
  const engine = table.engine ?? globalEngine;
  const charset = table.charset ?? globalCharset;
  if (engine) ddl += ` ENGINE=${engine}`;
  if (charset) ddl += ` DEFAULT CHARSET=${charset}`;
  ddl += ` COMMENT='Audit table for ${table.name}';`;
  return ddl;
}

export interface ExportDDLOptions {
  globalEngine?: string;
  globalCharset?: string;
  entityModes?: Record<string, EntityMode>;
  revisionSuffix?: string;
}

export function exportDDL(schema: TableSchema, options: ExportDDLOptions = {}): string {
  const {
    globalEngine = 'InnoDB',
    globalCharset = 'utf8mb4',
    entityModes = {},
    revisionSuffix = '_aud',
  } = options;

  const ddls: string[] = schema.tables.map((t) => tableDDL(t, globalEngine, globalCharset));

  // Check if any table has revision enabled
  const revisionTables = schema.tables.filter((t) => entityModes[t.name]?.revision);

  if (revisionTables.length > 0) {
    ddls.push('-- Hibernate Envers tables');
    ddls.push(revinfoDDL(globalEngine, globalCharset));

    for (const table of revisionTables) {
      ddls.push(auditTableDDL(table, revisionSuffix, globalEngine, globalCharset));
    }
  }

  return ddls.join('\n\n');
}
