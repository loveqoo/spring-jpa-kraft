# spring-jpa-kraft

Opinionated Spring MVC & JPA abstractions in Kotlin. Define an entity once — get Repository, Form, DTO, Service, and Controller generated and wired automatically.

## Pipeline

```
DDL(.sql)
  │
  ▼
ANTLR4 Parser ──> TableSchema ──> TableSchema JSON
                                        │
                               Aggregate Designer (SPA)
                                        │
                                        ▼
                                 AggregateConfig JSON
                                        │
              TableSchema JSON ─────────┤
                                        ▼
                                SkeletonGenerator
                                        │
              ┌─────────────────────────┼─────────────────────────┐
              ▼                         ▼                         ▼
        Entity .kt              Repository .kt           Form / DTO .kt
        Service .kt             Controller .kt           SearchFields .kt
```

## Modules

| Module | Description | Details |
|--------|-------------|---------|
| [module-core](module-core/) | `Result<T>` extensions (`flatMap`, `zip`) | [docs](docs/module-core.md) |
| [module-jpa](module-jpa/) | Entity base classes, type interfaces, DataSource routing, Specification search | [README](module-jpa/README.md) / [docs](docs/module-jpa.md) |
| [module-mvc](module-mvc/) | FormResolver, Service, Controller, Delegator hierarchy, error handling | [README](module-mvc/README.md) / [docs](docs/module-mvc.md) |
| [module-ksp-annotations](module-ksp-annotations/) | `@KraftAggregate`, `@KraftExpose` annotations | [docs](docs/module-ksp.md) |
| [module-ksp-processor](module-ksp-processor/) | KSP processor — type-safe ID + InternalMediator code generation | [docs](docs/module-ksp.md) |
| [module-entity-gen](module-entity-gen/) | ANTLR4 MySQL DDL parser + full skeleton code generation | [README](module-entity-gen/README.md) / [docs](docs/module-entity-gen.md) |
| [frontend](frontend/) | Aggregate Designer — visual DDD aggregate boundary designer (React SPA) | [README](frontend/README.md) |

## How It Works

### 1. Parse DDL

Parse MySQL DDL into a `TableSchema` and export as JSON.

```kotlin
val schema = DdlParser().parse(File("schema.sql"))
File("schema.json").writeText(TableSchemaSerializer().toJson(schema))
```

### 2. Design Aggregates

Load `schema.json` into the [Aggregate Designer](frontend/) SPA. Visually define aggregate roots, assign child entities, configure relations and ID strategies. Export as `AggregateConfig` JSON.

### 3. Generate Code

Feed both JSON files into `SkeletonGenerator` to produce 9 files per table.

```kotlin
val schema = TableSchemaSerializer().fromJson(File("schema.json").readText())
val config = AggregateConfigParser().parse(File("config.json").readText())
SkeletonGenerator().generate(schema, config, outputDir)
```

Generated files: Entity, Repository, CreateForm, UpdateForm, DTO, FormResolver, SearchFieldProvider, Service, Controller.

### 4. Run

The generated code builds on `module-jpa` and `module-mvc` abstractions — entities extend `BaseEntity` / `AggregateRootBaseEntity`, services implement `SearchableEntityService`, controllers extend `SearchableEntityController`. Everything wires together via Spring DI.

## Installation

Published to Maven Local (`./gradlew publishToMavenLocal`).

```kotlin
// settings.gradle.kts
repositories {
    mavenLocal()
    mavenCentral()
}

// build.gradle.kts
dependencies {
    implementation("io.github.loveqoo:module-core:0.0.1-SNAPSHOT")
    implementation("io.github.loveqoo:module-jpa:0.0.1-SNAPSHOT")
    implementation("io.github.loveqoo:module-mvc:0.0.1-SNAPSHOT")
    implementation("io.github.loveqoo:module-ksp-annotations:0.0.1-SNAPSHOT")
    ksp("io.github.loveqoo:module-ksp-processor:0.0.1-SNAPSHOT")
}
```

## Tech Stack

- Kotlin 2.2, Java 24
- Spring Boot 4.0, Spring Data JPA, Spring Data Envers
- KSP (Kotlin Symbol Processing)
- ANTLR4 (DDL parsing)

## Build

```bash
./gradlew build                          # all modules
./gradlew :module-entity-gen:build       # single module
./gradlew publishToMavenLocal            # publish to ~/.m2
```

All modules include ktlint code style checks as part of the build.

## License

TBD
