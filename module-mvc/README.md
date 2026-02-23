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

### 3. Implement a Controller

```kotlin
@RestController
@RequestMapping("/articles")
class ArticleController(
    override val service: ArticleService,
) : BaseEntityController<Long, Article, ArticleService, ArticleDto, ArticleCreateForm, ArticleUpdateForm>() {
    override val tableName = "article"

    override fun toReadDto(entity: Article) = ArticleDto(entity.id!!, entity.title)

    @GetMapping
    override fun list(pageable: Pageable) = super.list(pageable)

    @GetMapping("/{id}")
    override fun getOne(@PathVariable id: Long) = super.getOne(id)

    @PostMapping
    override fun createOne(@Valid @RequestBody request: ArticleCreateForm, errors: Errors) =
        super.createOne(request, errors)

    @PutMapping
    override fun updateOne(@Valid @RequestBody request: ArticleUpdateForm, errors: Errors) =
        super.updateOne(request, errors)

    @DeleteMapping("/{id}")
    override fun delete(@PathVariable id: Long) = super.delete(id)
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

## Controller Layer

Controllers provide HTTP endpoint abstraction on top of the service layer. The architecture follows a **Controller → Delegator → Service** pattern.

### Architecture

```
Controller (URL mapping + Mapper impl)
    │
    ├── delegates to ──▶ Delegator (DTO conversion, validation, service calls)
    │                        │
    │                        └── calls ──▶ Service
    │
    └── implements ──▶ Mapper (entity → DTO conversion)
```

- **Controller**: Abstract class that handles URL mapping. Implements the Mapper interface directly, passing `this` to the delegator. Only `service`, `tableName`, and mapper methods need to be overridden.
- **Delegator**: Contains the actual logic -- DTO transformation via mapper, `Errors` validation (throws `ValidationException`), and service invocation.
- **Mapper**: Interface that the controller implements to define entity-to-DTO conversion.

### Controller Hierarchy

```
ReadOnlyEntityController<ID, E, S, D>                   (list, getOne)
└── BaseEntityController<..., CF, UF>                    (createOne, updateOne, delete)
    ├── SearchableEntityController<..., R>               (QueryDSL + DynamicSearch)
    ├── RevisionEntityController<..., R>                 (Envers revision history)
    └── SearchableRevisionEntityController<..., R>       (Searchable + Revision combined)
```

### Delegator Hierarchy

```
ReadOnlyDelegator<ID, E, S, D>                           (list, getOne with mapper::toReadDto)
└── BaseEntityDelegator<..., CF, UF>                     (create/update/delete + Errors validation)
    ├── SearchableEntityDelegator<..., R>                 (predicate search, null fallback, customParams)
    ├── RevisionEntityDelegator<..., R>                   (revisions with mapper::toRevisionDto)
    └── SearchableRevisionEntityDelegator<..., R>         (Searchable + Revision combined)
```

### Mapper Interfaces

| Interface | Methods |
|---|---|
| `ReadOnlyMapper<ID, E, D>` | `toReadDto(entity): D` |
| `BaseEntityMapper<ID, E, D>` | `toCreateDto(entity): MutationResponse`, `toUpdateDto(entity): MutationResponse`, `toDeleteDto(id): MutationResponse` |
| `RevisionEntityMapper<ID, E, D>` | `toRevisionDto(entity): D` |

### MutationResponse

All write operations (`createOne`, `updateOne`, `delete`) return a `MutationResponse` — a structured DTO replacing raw JSON strings:

```kotlin
data class MutationResponse(
    val action: String,  // "create", "update", or "delete"
    val id: String,
    val name: String,
) : Serializable
```

Factory methods: `MutationResponse.create(id, name)`, `.update(id, name)`, `.delete(id, name)`.

The delegator's default `toCreateDto`/`toUpdateDto`/`toDeleteDto` implementations use these factories with `entity.id` and `entityName`. Controllers can override the mapper methods to customize the response.

### Action Interfaces

Each controller level has a corresponding **Action** interface — the required HTTP endpoint spec that every controller must implement:

| Action | Methods |
|---|---|
| `ReadOnlyAction` | `list(pageable)`, `getOne(id)` |
| `BaseEntityAction` | `createOne(request, errors)`, `updateOne(request, errors)`, `delete(id)` |
| `SearchableEntityAction` | `search(pageable, predicate?)`, `search(pageable, customParams)` |
| `RevisionEntityAction` | `revisions(id)`, `revisionPages(id, pageable)` |

### ActionExtend Interfaces

Each Action has a corresponding **ActionExtend** interface with `<T : Any> transformer` overloads. These define reusable extended capabilities that the **delegator** provides:

| ActionExtend | Methods |
|---|---|
| `ReadOnlyActionExtend` | `<T> list(pageable, transformer)`, `<T> getOne(id, transformer)` |
| `BaseEntityActionExtend` | `toCreateDto(entity, entityName): MutationResponse`, `toUpdateDto(entity, entityName): MutationResponse`, `toDeleteDto(id, entityName): MutationResponse` |
| `SearchableEntityActionExtend` | `<T> search(predicate, pageable, transformer)`, `<T> searchCustom(params, pageable, transformer)` |
| `RevisionEntityActionExtend` | `<T> revisions(id, transformer)`, `<T> revisionPages(id, pageable, transformer)` |

**Design intent**: Controllers don't need to know about ActionExtend — they only implement Action. But when a controller needs extended functionality (e.g., a custom transformer for a specific endpoint), it can access it through the `delegator` without implementing the logic itself. Since the delegator implements ActionExtend once, multiple controllers of similar types reuse the same extended logic instead of each duplicating it.

```kotlin
// Controller only implements Action (required spec)
@GetMapping("/summary")
fun summary(pageable: Pageable): Page<SummaryDto> =
    delegator.list(pageable) { entity -> SummaryDto.from(entity) }
    //       ↑ ActionExtend method — implemented once in Delegator, reused across controllers
```

### Key Design Decisions

- **Controller as Mapper**: The controller itself implements the Mapper interface, keeping DTO conversion logic co-located with the endpoint definitions.
- **Lazy delegator**: `delegator` is initialized via `by lazy`, allowing subclass controllers to override it with a more specific delegator type.
- **Validation in Delegator**: `Errors.hasErrors()` check and `FormValidationException` throwing are handled in the delegator, not the controller. The exception carries structured `List<ObjectError>` for the exception handler to process.

## Error Handling

A default `@ControllerAdvice` (`DefaultExceptionHandler`) is provided with `@Order(LOWEST_PRECEDENCE)`, so it can be overridden by a higher-priority handler in the consuming application.

### Handled Exceptions

| Exception | Status | Details |
|---|---|---|
| `FormValidationException` | 400 | `FieldError` → field/message/rejectedValue; `ObjectError` → objectName/message |
| `ConstraintViolationException` | 400 | Bean Validation violations → propertyPath/message/invalidValue |
| `EntityNotFoundException` | 404 | Exception message |

### Response Format

```json
{
  "status": 400,
  "error": "Bad Request",
  "message": "Form validation failed",
  "details": [
    { "field": "name", "message": "must not be blank", "rejectedValue": "" }
  ]
}
```

### FormValidationException

`FormValidationException` extends `jakarta.validation.ValidationException` and carries `List<ObjectError>` directly, enabling structured access to field names, messages, and rejected values without string parsing.

### Overriding

Register your own `@ControllerAdvice` with a higher `@Order` to override the default handler:

```kotlin
@ControllerAdvice
@Order(0)
class CustomExceptionHandler {
    @ExceptionHandler(FormValidationException::class)
    fun handle(ex: FormValidationException): ResponseEntity<MyErrorResponse> {
        // custom handling
    }
}
```

## Status

- **Implemented**: `FormResolver0`~`4`, `UpdateForm`, Service layer (`ReadOnlyEntityService`, `BaseEntityService`, `SearchableEntityService`, `RevisionEntityService`, `SearchableRevisionEntityService`, `AggregateRootAwareService`), Controller layer (`ReadOnlyEntityController`, `BaseEntityController`, `SearchableEntityController`, `RevisionEntityController`, `SearchableRevisionEntityController` + corresponding Delegators, Mappers, Actions), Error response mapping (`DefaultExceptionHandler`, `FormValidationException`, `ErrorResponse`)

## Build

```bash
./gradlew :module-mvc:build
```

Runs ktlint code style checks and tests alongside the build.
