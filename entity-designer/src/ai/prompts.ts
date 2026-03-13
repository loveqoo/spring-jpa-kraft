import type { AggregateConfig } from '../types/aggregateConfig';
import type { TableDef } from '../types/tableSchema';
import { AUDIT_COLUMN_NAMES } from '../types/tableSchema';
import type { ChatMessage } from './aiClient';

// ── Schema Generation: simple format that small models can handle ──

const SIMPLE_SCHEMA_PROMPT = `You design database tables. Return ONLY a JSON object with this format:
{"tables":[{"name":"table_name","columns":["col1 TYPE","col2 TYPE(size)"]}],"relationships":[{"parent":"parent_table","child":"child_table"}]}

Rules:
- Column format: "column_name TYPE" or "column_name TYPE(size)" or "column_name TYPE NOT NULL"
- Valid types: BIGINT, INT, SMALLINT, TINYINT, VARCHAR, CHAR, TEXT, LONGTEXT, DECIMAL, FLOAT, DOUBLE, BOOLEAN, TIMESTAMP, DATETIME, DATE, TIME, BLOB, JSON
- Do NOT include id columns or audit columns (created_at, etc). The system adds them.
- Do NOT include FK columns (parent_id). The system generates them from relationships.
- relationships: parent is the "one" side, child is the "many" side
- Return ONLY valid JSON. No markdown, no explanation.`;

export function buildSchemaGenerationMessages(userPrompt: string): ChatMessage[] {
  return [
    { role: 'system', content: SIMPLE_SCHEMA_PROMPT },
    { role: 'user', content: userPrompt },
  ];
}

// ── Designer Modification: uses existing AggregateConfig ──

const DELTA_MODIFICATION_PROMPT = `You modify database schemas. You will receive the current table list and a change request.
Return ONLY the CHANGES as a JSON object:
{"add_tables":[{"name":"new_table","columns":["col1 TYPE","col2 TYPE(size)"]}],"remove_tables":["table_to_delete"],"add_columns":[{"table":"existing_table","columns":["new_col TYPE"]}],"remove_columns":[{"table":"existing_table","columns":["old_col"]}],"add_relationships":[{"parent":"parent","child":"child"}],"remove_relationships":[{"parent":"parent","child":"child"}]}

Rules:
- add_tables: only NEW tables to create. Column format: "col TYPE" or "col TYPE(size)"
- remove_tables: only table names to delete
- add_columns: add columns to EXISTING tables. Column format: "col TYPE" or "col TYPE(size)" or "col TYPE NOT NULL"
- remove_columns: remove columns from EXISTING tables. Just the column name (no type).
- To RENAME a column: remove the old name + add the new name with the same type. Example: rename "test_name" to "name" → remove_columns:["test_name"], add_columns:["name VARCHAR(100)"]
- add_relationships: only NEW parent→child links
- remove_relationships: only links to delete
- To modify an existing table, use add_columns/remove_columns. Do NOT remove and re-add the table.
- Do NOT include id, audit (created_at, created_by, updated_at, updated_by), or FK columns
- Omit empty arrays (e.g. if nothing to remove, don't include remove_tables)
- Return ONLY valid JSON. No markdown, no explanation.`;

export function buildDesignerModificationMessages(
  currentConfig: AggregateConfig,
  userPrompt: string,
  targetTables?: string[],
): ChatMessage[] {
  const allTables = currentConfig.tableSchema?.tables ?? [];
  const targetSet = targetTables && targetTables.length > 0 ? new Set(targetTables) : null;

  // Build context: full detail for target tables (or all if none selected), names-only for the rest
  const tableDetails: string[] = [];
  const otherTableNames: string[] = [];
  for (const t of allTables) {
    if (!targetSet || targetSet.has(t.name)) {
      const cols = t.columns
        .filter((c) => !c.primaryKey)
        .filter((c) => !AUDIT_COLUMN_NAMES.has(c.name))
        .map((c) => `${c.name} ${c.typeName}${c.typeValue ? `(${c.typeValue})` : ''}`);
      tableDetails.push(`${t.name}(${cols.join(', ')})`);
    } else {
      otherTableNames.push(t.name);
    }
  }

  const rels = currentConfig.aggregates.flatMap((agg) =>
    agg.relations
      .filter((r) => r.type === 'OneToMany')
      .map((r) => `${agg.root} → ${r.target}`),
  );

  let context: string;
  if (targetSet) {
    context = `Target tables:\n${tableDetails.join('\n')}`;
    if (otherTableNames.length > 0) {
      context += `\nOther tables: ${otherTableNames.join(', ')}`;
    }
  } else {
    context = `Tables: ${tableDetails.join('; ')}`;
  }
  context += `\nRelationships: ${rels.join(', ') || 'none'}`;

  return [
    { role: 'system', content: DELTA_MODIFICATION_PROMPT },
    { role: 'user', content: `${context}\n\nChange: ${userPrompt}` },
  ];
}

// ── Table Modification: column-level changes (small output) ──

const TABLE_MOD_PROMPT = `You modify database table columns. Return ONLY a JSON object:
{"columns":[{"name":"col","typeName":"TYPE","typeValue":null,"primaryKey":false,"notNull":false,"unique":false,"autoIncrement":false,"defaultValue":null,"note":null}],"indexes":[{"name":"idx_name","columns":["col"],"unique":false,"primaryKey":false}]}

Valid types: BIGINT, INT, SMALLINT, TINYINT, VARCHAR, CHAR, TEXT, LONGTEXT, DECIMAL, FLOAT, DOUBLE, BOOLEAN, TIMESTAMP, DATETIME, DATE, TIME, BLOB, JSON
Keep all existing columns unless asked to remove. Return ONLY valid JSON.`;

export function buildTableModificationMessages(
  table: TableDef,
  userPrompt: string,
): ChatMessage[] {
  const cols = table.columns
    .filter((c) => !AUDIT_COLUMN_NAMES.has(c.name))
    .map((c) => ({ name: c.name, typeName: c.typeName, typeValue: c.typeValue, primaryKey: c.primaryKey, notNull: c.notNull, unique: c.unique, autoIncrement: c.autoIncrement, defaultValue: c.defaultValue, note: c.note }));
  const idxs = table.indexes.map((i) => ({ name: i.name, columns: i.columns, unique: i.unique, primaryKey: i.primaryKey }));

  return [
    { role: 'system', content: TABLE_MOD_PROMPT },
    { role: 'user', content: `Table "${table.name}":\n${JSON.stringify({ columns: cols, indexes: idxs })}\n\nChange: ${userPrompt}` },
  ];
}
