# module-mvc

Type-safe form-to-entity resolution for Spring MVC.
Handles validation, parent entity lookup, and entity construction in a single composable pipeline.

## Core Concept

A **FormResolver** converts a form object (HTTP request body) into a JPA entity through three steps:

```
Form ──▶ Validate ──▶ Load Parents ──▶ Create/Update Entity
              │              │                   │
     ConstraintViolation   repo.getReferenceById  Result<E>
```

All steps are composed via `Result<T>` with `flatMap` chaining, so any failure short-circuits the pipeline
and subsequent steps (including parent lookups) are skipped.

## Class Hierarchy

```
FormResolver<ID, E, CF, UF>          (base: validation + template)
├── FormResolver0                    (no parent dependencies)
├── FormResolver1<..., P1_ID, P1>    (1 parent)
├── FormResolver2<..., P1, P2>       (2 parents)
├── FormResolver3<..., P1, P2, P3>   (3 parents)
└── FormResolver4<..., P1..P4>       (4 parents)
```

Choose the variant that matches the number of parent entities your form references.

## Type Parameters

| Parameter | Constraint | Purpose |
|---|---|---|
| `ID` | `Comparable<ID>` | Entity PK type |
| `E` | `Identifiable<ID>` | Target entity |
| `CF` | `Any` | Create form (request body for creation) |
| `UF` | `UpdateForm<ID>` | Update form (request body for modification) |
| `P_ID` | `Comparable<P_ID>` | Parent entity PK type |
| `P` | `Identifiable<P_ID>` | Parent entity |

Each parent can have a different ID type (e.g., `Long`, `String`, `UUID`).

## Usage

### 1. Define Forms

```kotlin
data class ArticleCreateForm(
    @field:NotBlank val title: String,
    val categoryId: Long,
)

data class ArticleUpdateForm(
    override val id: Long,
    @field:NotBlank val title: String,
    val categoryId: Long?,
) : UpdateForm<Long>
```

### 2. Implement a FormResolver

```kotlin
@Component
class ArticleFormResolver(
    override val repo: JpaRepository<Article, Long>,
    override val repo1: JpaRepository<Category, Long>,
    override val validator: Validator,
) : FormResolver1<Long, Article, ArticleCreateForm, ArticleUpdateForm, Long, Category>() {

    override fun ArticleCreateForm.parentId() = Result.success(categoryId)

    override fun ArticleCreateForm.toEntity(p1: Category) =
        Result.success(Article(title = title, category = p1))

    override fun ArticleUpdateForm.parentId() = Result.success(categoryId)

    override fun ArticleUpdateForm.update(entity: Article, parent: Category?): Result<Unit> =
        runCatching {
            entity.title.updateProperty(title) { entity.title = it }
            parent?.let { entity.category = it }
        }
}
```

### 3. Use in a Controller (planned)

```kotlin
@PostMapping
fun create(@RequestBody form: ArticleCreateForm): ResponseEntity<*> {
    val entity = with(resolver) { form.toEntity() }.getOrThrow()
    return ResponseEntity.ok(repo.save(entity))
}
```

## FormResolver Variants

### FormResolver0 -- No Parents

For standalone entities with no foreign key dependencies.

| Override | Purpose |
|---|---|
| `CF.createEntity(): Result<E>` | Build a new entity from the create form |
| `UF.modify(entity: E): Result<Unit>` | Apply updates to the loaded entity |

### FormResolver1~4 -- With Parents

For entities that reference 1~4 parent entities.

| Override | Purpose |
|---|---|
| `CF.parentIdN(): Result<P_ID>` | Extract parent ID from create form |
| `CF.toEntity(p1, ...): Result<E>` | Build entity with loaded parents |
| `UF.parentIdN(): Result<P_ID?>` | Extract optional parent ID from update form |
| `UF.update(entity, p1?, ...): Result<Unit>` | Apply updates with optional parents |

Parent IDs are **required** (`Result<P_ID>`) in create forms and **optional** (`Result<P_ID?>`) in update forms.
When a parent ID is `null` in an update form, `null` is passed to the `update()` method.

## UpdateForm Utilities

`UpdateForm.Companion` provides helper functions for conditional property updates:

| Method | When it applies the setter |
|---|---|
| `E?.updateEntity(target, setter)` | `target != null` and IDs differ |
| `P?.updateProperty(target, setter)` | `target != null` and values differ |
| `P1?.updateProperty(raw, supplier, setter)` | `raw != null` and transformed value differs |

These prevent unnecessary dirty detection by only calling setters when values actually change.

## Key Design Decisions

- **Result-based error handling** -- inside the `Result` pipeline, all exceptions (including infrastructure errors like `EntityNotFoundException`) are captured as `Result.failure`. The caller (Service/Controller) is responsible for unwrapping the result and re-throwing if needed (e.g., via `getOrThrow()` for `@ExceptionHandler` integration).
- **Hibernate proxy safety** -- `getReferenceById()` results are passed through `unproxy()` before use.
- **transform() hook** -- override `transform(entity)` to apply cross-cutting logic (e.g., permission checks) after entity loading.

## Service Layer

Services are defined as **interfaces with default methods**. Implementors only need to provide the required dependencies (`repo`, `formResolver`, etc.).

### Hierarchy

```
ReadOnlyService<ID, E>                          (findById, getOne, findAll, ...)
└── BaseEntityService<ID, E, CF, UF>            (create, update, delete via FormResolver)
    ├── SearchableEntityService<..., R>          (QueryDSL + DynamicSearch)
    ├── RevisionEntityService<..., R>            (Envers revision history)
    └── SearchableRevisionEntityService<..., R>  (Searchable + Revision combined)

AggregateRootAwareService<ID, E, RE>            (domain event publishing)
```

### ReadOnlyService

| Method | Description |
|---|---|
| `findById(id)` | Returns entity or `null` |
| `findById(id, transformer)` | Returns transformed result or `null` |
| `getOne(id)` | Returns entity reference (throws if not found) |
| `getOne(id, transformer)` | Returns transformed reference |
| `getByIdIn(ids)` | Returns all entities matching the IDs |
| `findAll(pageable)` | Returns paged results |
| `findAll(pageable, transformer)` | Returns paged transformed results |

### BaseEntityService

Extends `ReadOnlyService`. Uses `FormResolver` to create/update entities.

| Method | Description |
|---|---|
| `create(request)` | Resolves form → saves entity → calls `check()` if `Checkable` |
| `update(request)` | Resolves form → saves entity → calls `check()` if `Checkable` |
| `delete(id)` | Delegates to `repo.deleteById()` |

Result pipeline failures are unwrapped via `getOrThrow()`, propagating exceptions to the caller.

### SearchableEntityService

Requires `repo` to implement `QuerydslPredicateExecutor` and `DynamicSearchRepository`.

| Method | Description |
|---|---|
| `search(predicate, pageable)` | QueryDSL predicate-based search |
| `searchCustom(params, pageable)` | Dynamic search via `Map<String, String>` |

### RevisionEntityService

Requires `repo` to implement `RevisionRepository<E, ID, Int>`.

| Method | Description |
|---|---|
| `findRevisions(id)` | Returns all revisions for an entity |
| `findRevisionPages(id, pageable)` | Returns paged revisions |

Both methods have transformer overloads for DTO projection.

### AggregateRootAwareService

Standalone interface for publishing domain events through aggregate roots.

Implementors must provide:

| Property | Purpose |
|---|---|
| `aggregateRootRepo` | JPA repository for the aggregate root entity |
| `entityType` | `Class<E>` for runtime type checking (e.g., `MyEntity::class.java`) |

```kotlin
fun publishEvent(entity: Any)
```

Uses `entityType.isInstance(entity)` for exact runtime type checking, so only entities of the expected type trigger event publishing. Non-matching types -- including `AggregateRootAware` entities from different aggregate hierarchies -- are silently ignored.

### Usage Example

```kotlin
@Service
class ArticleService(
    override val repo: ArticleRepository,
    override val formResolver: ArticleFormResolver,
) : BaseEntityService<Long, Article, ArticleCreateForm, ArticleUpdateForm> {
    override val tableName = "article"
}
```

## Status

- **Implemented**: `FormResolver0`~`4`, `UpdateForm`, Service layer (`ReadOnlyService`, `BaseEntityService`, `SearchableEntityService`, `RevisionEntityService`, `SearchableRevisionEntityService`, `AggregateRootAwareService`)
- **Planned**: Controller integration, error response mapping

## Build

```bash
./gradlew :module-mvc:build
```

Runs ktlint code style checks and tests alongside the build.
