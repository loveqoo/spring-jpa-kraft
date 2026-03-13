# spring-jpa-kraft

Model your database visually, export two JSON files, and get a fully wired Spring MVC + JPA backend generated automatically.

## What You Can Do

```
Aggregate Designer (SPA)
        │
        │  Visual modeling — tables, columns, indexes,
        │  relations, aggregate boundaries, ID strategies
        │
        ├──> DDL (.sql)
        │      CREATE TABLE statements ready to execute
        │
        └──> AggregateConfig (.json)
               DDD aggregate structure + JPA configuration
               │
               ├──> Entity .kt
               ├──> Repository .kt
               ├──> CreateForm / UpdateForm .kt
               ├──> DTO .kt
               ├──> FormResolver .kt
               ├──> SearchFieldProvider .kt
               ├──> Service .kt
               └──> Controller .kt
```

**No DDL required to start.** Open the SPA, design your tables and relations from scratch, then export everything you need.

Already have DDL? Paste it into the SPA to import existing schemas, then refine and export.

## Quick Start

```bash
git clone https://github.com/loveqoo/spring-jpa-kraft.git
cd spring-jpa-kraft
```

The SPA and code generator run from this repository. Clone it first.

### 1. Model

Open the [Aggregate Designer](entity-designer/) SPA. Create tables, define columns and indexes, draw relations between tables. Mark aggregate roots and assign child entities.

### 2. Export

Export two files from the SPA:
- **DDL** — run against your database
- **AggregateConfig JSON** — feed into the code generator

### 3. Generate

```kotlin
val schema = TableSchemaSerializer().fromJson(File("schema.json").readText())
val config = AggregateConfigParser().parse(File("config.json").readText())
SkeletonGenerator().generate(schema, config, outputDir)
```

9 files per table. Entities extend `BaseEntity` / `AggregateRootBaseEntity`, services implement `SearchableEntityService`, controllers extend `SearchableEntityController`. Everything wires together via Spring DI.

## Installation

The generated code (Entity, Service, Controller, etc.) depends on base classes and interfaces from this library. Add these dependencies to your project so the generated files compile.

Published to Maven Local (`./gradlew publishToMavenLocal`).

```kotlin
dependencies {
    implementation("io.github.loveqoo:module-jpa-mvc:0.0.1-SNAPSHOT")
    implementation("io.github.loveqoo:module-ksp-annotations:0.0.1-SNAPSHOT")
    ksp("io.github.loveqoo:module-ksp-processor:0.0.1-SNAPSHOT")
}
```

## Modules

| Module | Description |
|--------|-------------|
| [entity-designer](entity-designer/) | Aggregate Designer — visual modeling SPA (React) |
| [module-entity-gen](module-entity-gen/) | DDL parser + skeleton code generator |
| [module-jpa-mvc](module-jpa-mvc/) | Entity base classes, Service/Controller hierarchy, DataSource routing |
| [module-ksp-annotations](module-ksp-annotations/) | `@KraftAggregate`, `@KraftExpose` |
| [module-ksp-processor](module-ksp-processor/) | KSP — type-safe ID + InternalMediator generation |

## Build

```bash
./gradlew build                    # all modules
./gradlew publishToMavenLocal      # publish to ~/.m2
```

## Tech Stack

Kotlin 2.2, Java 24, Spring Boot 4.0, Spring Data JPA, KSP, ANTLR4, React

## License

TBD
