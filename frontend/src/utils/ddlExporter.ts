import type { TableSchema, TableDef, TableColumn } from '../types/tableSchema';

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

export function exportDDL(schema: TableSchema, globalEngine = 'InnoDB', globalCharset = 'utf8mb4'): string {
  return schema.tables.map((t) => tableDDL(t, globalEngine, globalCharset)).join('\n\n');
}
