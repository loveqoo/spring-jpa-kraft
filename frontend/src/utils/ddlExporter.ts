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
  return def;
}

function tableDDL(table: TableDef): string {
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

  return `CREATE TABLE ${escapeIdentifier(table.name)} (\n${lines.join(',\n')}\n);`;
}

export function exportDDL(schema: TableSchema): string {
  return schema.tables.map(tableDDL).join('\n\n');
}
