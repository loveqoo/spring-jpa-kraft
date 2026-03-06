# module-entity-gen

Parses MySQL DDL (`.sql`) using ANTLR4 and generates a full JPA application skeleton — Entity, Repository, Form, DTO, Service, and Controller.

## Pipeline

```
DDL(.sql)
  │
  ▼
ANTLR4 (MySQLLexer / MySQLParser)
  │
  ▼
TableSchema ──TableSchemaSerializer──> TableSchema JSON
                                            │
                                   Frontend SPA (Aggregate Designer)
                                            │
                                            ▼
                                     AggregateConfig JSON
                                            │
              TableSchema JSON ─────────────┤
                                            ▼
                                    SkeletonGenerator
                                            │
                    ┌───────────────────────┬┴┬──────────────────────┐
                    ▼                       ▼ ▼                      ▼
              Entity .kt           Repository .kt          Form / DTO .kt
           Service .kt          Controller .kt         SearchFields .kt
```

## Core types

- `TableSchema`, `TableDef`, `TableColumn`, `TableIndex`
- `DdlParser.parse(sqlFile: File): TableSchema`
- `CreateTableVisitor`: extracts table/column/index metadata from `CREATE TABLE` statements

## TableSchema serialization

`TableSchemaSerializer` exports/imports `TableSchema` as JSON, enabling integration with external tools like the frontend Aggregate Designer SPA.

```kotlin
val schema = DdlParser().parse(File("schema.sql"))
val serializer = TableSchemaSerializer()

// Export to JSON
File("schema.json").writeText(serializer.toJson(schema))

// Restore from JSON
val restored = serializer.fromJson(File("schema.json").readText())
```

## Aggregate config

`AggregateConfig` defines aggregate boundaries, relations, and ID generation strategy.

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

The frontend [Aggregate Designer](../frontend/) provides a visual canvas to compose this config from a TableSchema JSON.

## Generated files

`SkeletonGenerator` produces 9 files per table:

| Package | File | Role |
|---------|------|------|
| `entity/` | `{Class}.kt` | JPA Entity |
| `repository/` | `{Class}Repository.kt` | JpaRepository + JpaSpecificationExecutor |
| `form/` | `{Class}CreateForm.kt` | Create form (data class) |
| `form/` | `{Class}UpdateForm.kt` | Update form (nullable fields, `UpdateForm<ID>`) |
| `dto/` | `{Class}Dto.kt` | Read DTO (`Serializable`) |
| `service/` | `{Class}FormResolver.kt` | FormResolver0~4 based on forward relation count |
| `service/` | `{Class}SearchFields.kt` | SearchFieldProvider (String columns → LIKE) |
| `service/` | `{Class}Service.kt` | SearchableEntityService |
| `controller/` | `{Class}Controller.kt` | SearchableEntityController |

## Usage

### Full skeleton generation (recommended)

```kotlin
val schema = TableSchemaSerializer().fromJson(File("schema.json").readText())
val config = AggregateConfigParser().parse(File("config.json").readText())
SkeletonGenerator().generate(schema, config, outputDir)
```

### Entity-only generation

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
./gradlew :module-entity-gen:generateGrammarSource
./gradlew :module-entity-gen:test
./gradlew :module-entity-gen:check
```
