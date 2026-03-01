# module-ddl-parser

Parses MySQL DDL (`.sql`) directly using ANTLR4 and generates JPA Entity `.kt` files.

```
DDL(.sql) ──ANTLR4(MySQLLexer/MySQLParser)──> TableSchema ──EntityGenerator──> Entity .kt files
                                        + Aggregate Config JSON
```

## What changed

- Removed npm `@dbml/core` dependency.
- Removed DBML JSON intermediate format.
- Direct flow: `DDL -> ANTLR parser -> TableSchema -> Generator`.

## Core types

- `TableSchema`, `TableDef`, `TableColumn`, `TableIndex`
- `DdlParser.parse(sqlFile: File): TableSchema`
- `CreateTableVisitor`: extracts table/column/index metadata from `CREATE TABLE` statements

## Aggregate config

`AggregateConfig` defines aggregate boundaries and explicit relations.

```json
{
  "basePackage": "com.example.order",
  "aggregates": [
    {
      "root": "orders",
      "relations": [
        { "type": "OneToMany", "target": "order_items", "joinColumn": "order_id" }
      ],
      "entities": [
        {
          "table": "order_items",
          "relations": [
            { "type": "ManyToOne", "target": "orders", "joinColumn": "order_id" }
          ]
        }
      ]
    }
  ]
}
```

## Usage

```kotlin
val schema = DdlParser().parse(File("schema.sql"))
val config = AggregateConfigParser().parse(configJson)
EntityGenerator().generate(schema, config, outputDir)
```

## Relation generation policy

- Bidirectional relation detected by counterpart forward relation:
  - `@OneToMany(mappedBy = ...)`
  - `@OneToOne(mappedBy = ...)`
- Unidirectional reverse relation (no counterpart):
  - `@OneToMany @JoinColumn(...)`
  - `@OneToOne @JoinColumn(...)`
- `ManyToOne`/forward `OneToOne` relation nullability follows FK column `notNull`.

## Build

```bash
./gradlew :module-ddl-parser:generateGrammarSource
./gradlew :module-ddl-parser:test
./gradlew :module-ddl-parser:check
```
