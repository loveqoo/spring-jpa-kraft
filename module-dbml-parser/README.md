# module-dbml-parser

Parses [`@dbml/core`](https://www.npmjs.com/package/@dbml/core) export JSON into Kotlin data models (`DbmlSchema`, `DbmlTable`, `DbmlColumn`, `DbmlIndex`).

This module is the **parsing stage** of a DDL-based code generation pipeline:

```
DDL (MySQL)  ──@dbml/core──>  JSON  ──this module──>  Kotlin data model  ──(next stage)──>  Entity, Repository, ...
```

## Generating JSON from DDL

### Prerequisites

```bash
npm install @dbml/core
```

### Step 1: DDL &rarr; JSON (one-liner)

If you have a `.sql` file containing MySQL DDL:

```javascript
const { importer, exporter } = require('@dbml/core');
const fs = require('fs');

const ddl = fs.readFileSync('./schema.sql', 'utf-8');
const dbml = importer.import(ddl, 'mysql');
const json = exporter.export(dbml, 'json');

fs.writeFileSync('./schema.json', json);
```

Or as a single CLI command:

```bash
node -e "
  const { importer, exporter } = require('@dbml/core');
  const fs = require('fs');
  const ddl = fs.readFileSync('./schema.sql', 'utf-8');
  const json = exporter.export(importer.import(ddl, 'mysql'), 'json');
  fs.writeFileSync('./schema.json', json);
"
```

### Step 2 (alternative): DBML &rarr; JSON

If you already have a `.dbml` file instead of raw DDL:

```javascript
const { exporter } = require('@dbml/core');
const fs = require('fs');

const dbml = fs.readFileSync('./schema.dbml', 'utf-8');
const json = exporter.export(dbml, 'json');

fs.writeFileSync('./schema.json', json);
```

### Supported DDL dialects

`@dbml/core` `importer.import()` supports: `mysql`, `postgres`, `mssql`, `snowflake`.

## Example

### Input DDL (`schema.sql`)

```sql
CREATE TABLE orders (
    id       BIGINT       NOT NULL AUTO_INCREMENT PRIMARY KEY,
    name     VARCHAR(255) NOT NULL UNIQUE,
    status   VARCHAR(50)  NOT NULL DEFAULT 'PENDING'
);

CREATE INDEX idx_status ON orders (status);
```

### Generated JSON (`schema.json`)

```json
{
  "schemas": [
    {
      "tables": [
        {
          "name": "orders",
          "fields": [
            {
              "name": "id",
              "type": { "type_name": "bigint" },
              "pk": true,
              "not_null": true,
              "unique": false,
              "increment": true,
              "dbdefault": null,
              "note": null
            },
            {
              "name": "name",
              "type": { "type_name": "varchar", "value": 255 },
              "pk": false,
              "not_null": true,
              "unique": true,
              "increment": false,
              "dbdefault": null,
              "note": null
            },
            {
              "name": "status",
              "type": { "type_name": "varchar", "value": 50 },
              "pk": false,
              "not_null": true,
              "unique": false,
              "increment": false,
              "dbdefault": { "value": "PENDING", "type": "string" },
              "note": null
            }
          ],
          "indexes": [
            {
              "name": "idx_status",
              "unique": false,
              "pk": false,
              "columns": [
                { "type": "column", "value": "status" }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

### Kotlin usage

```kotlin
val parser = DbmlJsonParser()
val schema = parser.parse(jsonString)

schema.tables.forEach { table ->
    println("Table: ${table.name}")
    table.columns.forEach { col ->
        println("  ${col.name}: ${col.typeName}${col.typeValue?.let { "($it)" } ?: ""}")
    }
}
```

Output:

```
Table: orders
  id: bigint
  name: varchar(255)
  status: varchar(50)
```

## Data model

| Class | Fields |
|---|---|
| `DbmlSchema` | `tables: List<DbmlTable>` |
| `DbmlTable` | `name`, `schema?`, `columns`, `indexes` |
| `DbmlColumn` | `name`, `typeName`, `typeValue?`, `primaryKey`, `notNull`, `unique`, `autoIncrement`, `defaultValue?`, `note?` |
| `DbmlIndex` | `name?`, `columns: List<String>`, `unique`, `primaryKey` |

## Notes

- `refs` (foreign key references) in the JSON are **ignored** — FK relationships are handled at a higher layer.
- `pk: true` automatically implies `notNull: true`, regardless of the original `not_null` value.
- `dbdefault.value` is normalized to `String?` (e.g., numeric `0` becomes `"0"`).
