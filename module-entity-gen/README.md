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

The [Aggregate Designer](../app-entity-designer/) provides a visual canvas to compose this config from a TableSchema JSON.

## Entity Mode

Each entity can be configured with meta properties that determine which Service/Controller variant is generated:

| Flag | Default | Effect |
|------|---------|--------|
| `readOnly` | `false` | Generates ReadOnly variants only (no forms, no CUD endpoints) |
| `searchable` | `true` | Adds JPA Specification search support |
| `revision` | `false` | Adds Envers revision history endpoints, generates `toRevisionDto` |

`readOnly` is exclusive — it cannot be combined with `searchable` or `revision`.

The five generated variants are:

| Variant | Condition | Service | Controller |
|---------|-----------|---------|------------|
| READ_ONLY | `readOnly=true` | `ReadOnlyService` | `ReadOnlyEntityController` |
| BASE | `searchable=false, revision=false` | `BaseEntityService` | `BaseEntityController` |
| SEARCHABLE | `searchable=true, revision=false` | `SearchableEntityService` | `SearchableEntityController` |
| REVISION | `searchable=false, revision=true` | `RevisionEntityService` | `RevisionEntityController` |
| SEARCHABLE_REVISION | `searchable=true, revision=true` | `SearchableRevisionEntityService` | `SearchableRevisionEntityController` |

## Generated files

`SkeletonGenerator` produces up to 9 files per table (depending on entity mode):

| Package | File | Role | Condition |
|---------|------|------|-----------|
| `entity/` | `{Class}.kt` | JPA Entity | always |
| `repository/` | `{Class}Repository.kt` | JpaRepository + JpaSpecificationExecutor | always |
| `form/` | `{Class}CreateForm.kt` | Create form (data class) | not readOnly |
| `form/` | `{Class}UpdateForm.kt` | Update form (nullable fields, `UpdateForm<ID>`) | not readOnly |
| `dto/` | `{Class}Dto.kt` | Read DTO (`Serializable`) | always |
| `service/` | `{Class}FormResolver.kt` | FormResolver0~4 based on forward relation count | not readOnly |
| `service/` | `{Class}SearchFields.kt` | SearchFieldProvider (String columns → LIKE) | searchable |
| `service/` | `{Class}Service.kt` | Service variant | always |
| `controller/` | `{Class}Controller.kt` | Controller variant | always |

## Usage

### Full skeleton generation

```kotlin
val schema = TableSchemaSerializer().fromJson(File("schema.json").readText())
val config = AggregateConfigParser().parse(File("config.json").readText())
SkeletonGenerator().generate(schema, config, outputDir)
```

### Selective generation (specific tables only)

When adding new tables to an existing project, generate only the new entities instead of regenerating everything:

```kotlin
SkeletonGenerator().generate(schema, config, outputDir, targetTables = setOf("payments", "refunds"))
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

## Gradle Plugin

```kotlin
plugins {
    id("spring.kraft.entity-gen")
}

kraftEntityGen {
    configFile.set(file("aggregate-config.json"))
    // Optional: DDL file (if config doesn't embed tableSchema)
    ddlFile.set(file("schema.sql"))
    // Optional: output directory (default: "src/main/kotlin")
    outputDir.set("src/main/kotlin")
    // Optional: generate only specific tables (default: all)
    targetTables.set(listOf("payments", "refunds"))
}
```

Run with:

```bash
./gradlew generateEntities
```

When `targetTables` is not set, all entities in the config are generated.
When set, only the specified tables are generated — useful when adding new tables to an existing project.

## Build

```bash
./gradlew :module-entity-gen:generateGrammarSource
./gradlew :module-entity-gen:test
./gradlew :module-entity-gen:check
```
