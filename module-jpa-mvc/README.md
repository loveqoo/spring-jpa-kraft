# module-jpa-mvc

A unified module combining JPA entity abstraction, MVC form resolution, service orchestration, and controller delegation for Spring Boot applications.

## Package Overview

| Package | Purpose |
|---|---|
| `spring.kraft.core` | `Result<T>` extension functions (`flatMap`, `zip`, `zipLazy`) |
| `spring.kraft.jpa.type` | Entity type interfaces (`Identifiable`, `Traceable`, `SoftDeletable`, ...) |
| `spring.kraft.jpa` | Base entities (`BaseEntity`, `AggregateRootBaseEntity`) |
| `spring.kraft.jpa.repo` | Repository interfaces (`SiblingsAwareRepository`) |
| `spring.kraft.jpa.search` | JPA Specification-based search (`SearchOp`, `SearchBinder`, `SearchFieldProvider`) |
| `spring.kraft.jpa.datasource` | Master/slave DataSource routing |
| `spring.kraft.form` | Form-to-entity resolution (`FormResolver0`~`4`, `UpdateForm`) |
| `spring.kraft.service` | Service layer interfaces (`ReadOnlyService` → `BaseEntityService` → variants) |
| `spring.kraft.service.event` | Aggregate root domain events (`AggregateRootVersionUpEvent`) |
| `spring.kraft.controller` | Controller abstractions (`ReadOnlyEntityController` → variants) |
| `spring.kraft.controller.delegator` | Controller delegation logic |
| `spring.kraft.controller.action` | Action/ActionExtend endpoint spec interfaces |
| `spring.kraft.controller.mapper` | Entity-to-DTO mapper interfaces |
| `spring.kraft.controller.dto` | Response DTOs (`MutationResponse`) |
| `spring.kraft.controller.exception` | Error handling (`DefaultExceptionHandler`, `FormValidationException`) |

## Core — Result Extensions

Extension functions on `kotlin.Result<T>` for monadic composition:

| Function | Description |
|---|---|
| `flatMap(transform)` | Chain `Result<T>` → `Result<R>` |
| `zip(other, transform)` | Combine 2~5 Results (eager evaluation) |
| `zipLazy(other, transform)` | Combine 2~5 Results (lazy — subsequent evaluated only on success) |

## JPA — Entity Type System

### Type Interfaces

| Interface | Purpose | Key Members |
|---|---|---|
| `Identifiable<ID>` | Identity | `id: ID?`, `isNew: Boolean` |
| `Traceable` | Auditing | `createdAt`, `createdBy`, `updatedAt`, `updatedBy` |
| `OptimisticLockSupport` | Optimistic locking | `versionNumber: Long`, `versionUp()` |
| `SoftDeletable` | Soft delete | `deleted: Boolean`, `delete()` |
| `Checkable` | Custom validation | `check()` |
| `ParentIdAware<ID>` | Parent reference | `parentId(): ID` |
| `AggregateRootAware<ID, E>` | Aggregate root reference | `aggregateRoot(): E` |

Each interface provides column name constants (`Columns`) to enforce consistent schema naming.
The `ID` type is constrained to `Comparable<ID>`, accepting `Long`, `UUID`, `String`, `ULID`, etc.

### Base Entities

```
Identifiable ─┐
               ├─ BaseEntity (audit, equals/hashCode)
Traceable ─────┘

Identifiable ──────────┐
Traceable ─────────────┤
OptimisticLockSupport ─┼─ AggregateRootBaseEntity (all above + domain events)
SoftDeletable ─────────┘
```

**BaseEntity\<ID\>** — base class for general entities. `@MappedSuperclass` with Spring Auditing integration. Equality is id-based when persisted, `@IdentityColumn`-based when transient.

**AggregateRootBaseEntity\<A, ID\>** — base class for aggregate roots. Adds `@Version` optimistic locking, `delete()` soft delete, and domain event collection (`addDomainEvent`, `@DomainEvents`/`@AfterDomainEventPublication`).

### Equality Strategy

| State | Comparison |
|---|---|
| Persisted (`isNew == false`) | id-based |
| Transient (`isNew == true`) | `@IdentityColumn`-annotated fields via reflection |

```kotlin
@Entity
class Order(
    @get:IdentityColumn
    val orderNumber: String,
) : BaseEntity<Long>() {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    override var id: Long? = null
}
```

### Repositories

| Repository | Paired Interface | Purpose |
|---|---|---|
| `SiblingsAwareRepository<E, P_ID>` | `ParentIdAware` | Query sibling entities sharing the same parent |

### Search

JPA `Specification`-based search with `@QuerydslPredicate`-compatible conventions.

| Class | Purpose |
|---|---|
| `SearchOp` | Search operators: `EQ`, `LIKE`, `GTE`, `LTE`, `BETWEEN`, `IS_NULL` |
| `SearchBinder<E>` | DSL for per-field operator binding |
| `SearchFieldProvider<E>` | Entity-specific search config: `customize(binder)` + `defaultSort()` |
| `SearchSpecBuilder` | `Map<String, List<String>>` + provider → `Specification<E>?` |

**BETWEEN convention**: Pass the same parameter name twice — `?createdAt=<from>&createdAt=<to>`.

### EntityHelper

| Method | Purpose |
|---|---|
| `compareTo(e1, e2): Result<Int>` | id-based comparison; fails if either entity is transient |
| `transientEquals(o1, o2)` | Equality based on `@IdentityColumn` fields |
| `transientHashCode(e1)` | Hash code based on `@IdentityColumn` fields |

### DataSource Routing

Auto-configuration for master/slave DataSource routing based on `@Transactional(readOnly = true)`.

```
LazyConnectionDataSourceProxy          ← delays Connection acquisition
└── ReadOnlyRoutingDataSource          ← AbstractRoutingDataSource
    ├── master: HikariDataSource       ← write transactions
    └── slaves: HikariDataSource[]     ← read-only transactions (round-robin)
```

Activates only when `kraft.datasource.master.jdbc-url` is present.

```yaml
kraft:
  datasource:
    master:
      jdbc-url: jdbc:mysql://master:3306/db
      username: root
      maximum-pool-size: 10
    slaves:
      - jdbc-url: jdbc:mysql://slave1:3306/db
        username: reader
        maximum-pool-size: 5
```

## MVC — FormResolver

A **FormResolver** converts a form object (HTTP request body) into a JPA entity:

```
Form ──▶ Validate ──▶ Load Parents ──▶ Create/Update Entity
```

All steps are composed via `Result<T>` with `flatMap` chaining — any failure short-circuits the pipeline.

### Variants

| Class | Parents | Key Overrides |
|---|---|---|
| `FormResolver0` | 0 | `CF.createEntity()`, `UF.modify(entity)` |
| `FormResolver1` | 1 | `CF.parentId()`, `CF.toEntity(p1)`, `UF.update(entity, p1?)` |
| `FormResolver2` | 2 | Same pattern with 2 parents |
| `FormResolver3` | 3 | Same pattern with 3 parents |
| `FormResolver4` | 4 | Same pattern with 4 parents |

Parent IDs are **required** in create forms and **optional** in update forms.

### Usage

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

### UpdateForm Utilities

| Method | When it applies the setter |
|---|---|
| `E?.updateEntity(target, setter)` | `target != null` and IDs differ |
| `P?.updateProperty(target, setter)` | `target != null` and values differ |
| `P1?.updateProperty(raw, supplier, setter)` | `raw != null` and transformed value differs |

## Service Layer

Services are **interfaces with default methods**. Implementors only provide dependencies.

### Hierarchy

```
ReadOnlyService<ID, E>                          (findById, getOne, findAll)
└── BaseEntityService<ID, E, CF, UF>            (create, update, delete via FormResolver)
    ├── SearchableEntityService<..., R>          (JPA Specification search)
    ├── RevisionEntityService<..., R>            (Envers revision history)
    └── SearchableRevisionEntityService<..., R>  (Searchable + Revision combined)

AggregateRootAwareService<ID, E, RE>            (domain event publishing)
```

### ReadOnlyService

| Method | Description |
|---|---|
| `findById(id)` | Returns entity or `null` |
| `getOne(id)` | Returns entity reference (throws if not found) |
| `getByIdIn(ids)` | Returns all entities matching the IDs |
| `findAll(pageable)` | Returns paged results |

All methods have `transformer` overloads for DTO projection.

### BaseEntityService

| Method | Description |
|---|---|
| `create(request)` | Resolves form → saves → `check()` if `Checkable` → `afterSave()` |
| `update(request)` | Resolves form → saves → `check()` if `Checkable` → `afterSave()` |
| `delete(id)` | `beforeDelete()` → `repo.deleteById()` |

#### Lifecycle Hooks

| Hook | Trigger | Default |
|---|---|---|
| `afterSave(entity)` | After create/update | Publishes aggregate root events if `AggregateRootAware` |
| `beforeDelete(id)` | Before delete | Same as above |

### SearchableEntityService

| Method | Description |
|---|---|
| `search(params, pageable)` | `Map<String, List<String>>` → `Specification` via `SearchSpecBuilder` |
| `search(spec, pageable)` | Direct `Specification<E>?` for programmatic use |

### RevisionEntityService

| Method | Description |
|---|---|
| `findRevisions(id)` | Returns all revisions for an entity |
| `findRevisionPages(id, pageable)` | Returns paged revisions |

### AggregateRootAwareService

Publishes domain events through aggregate roots. Uses `entityType.isInstance(entity)` for runtime type checking.

Performs: `aggregateRoot()` → `versionUp()` → `addDomainEvent(AggregateRootVersionUpEvent)` → `save()`.

## Controller Layer

Controllers follow a **Controller → Delegator → Service** pattern.

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

### Controller Hierarchy

```
ReadOnlyEntityController<ID, E, S, D>                   (list, getOne)
└── BaseEntityController<..., CF, UF>                    (createOne, updateOne, delete)
    ├── SearchableEntityController<..., R>               (JPA Specification search)
    ├── RevisionEntityController<..., R>                 (Envers revision history)
    └── SearchableRevisionEntityController<..., R>       (Searchable + Revision combined)
```

### MutationResponse

All write operations return `MutationResponse`:

```kotlin
data class MutationResponse(
    val action: String,  // "create", "update", or "delete"
    val id: String,
    val name: String,
)
```

### Action & ActionExtend

**Action** interfaces define the required HTTP endpoint spec. **ActionExtend** interfaces provide transformer overloads through the delegator:

```kotlin
@GetMapping("/summary")
fun summary(pageable: Pageable): Page<SummaryDto> =
    delegator.list(pageable) { entity -> SummaryDto.from(entity) }
```

### Usage

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

## Error Handling

A default `@ControllerAdvice` (`DefaultExceptionHandler`) with `@Order(LOWEST_PRECEDENCE)`.

| Exception | Status | Details |
|---|---|---|
| `FormValidationException` | 400 | Field/object errors with rejected values |
| `ConstraintViolationException` | 400 | Bean Validation violations |
| `EntityNotFoundException` | 404 | Exception message |

Override by registering your own `@ControllerAdvice` with a higher `@Order`.

## How to Extend

### Adding an Entity Type

1. Define an interface in `spring.kraft.jpa.type`
2. Optionally add a corresponding repository in `spring.kraft.jpa.repo`
3. Compose into a base entity or implement directly

```kotlin
interface Orderable {
    val sortOrder: Int
}

@Entity
class MenuItem(
    @get:IdentityColumn val name: String,
    override val sortOrder: Int,
) : BaseEntity<Long>(), Orderable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    override var id: Long? = null
}
```

### Full Stack Example

```kotlin
// Forms
data class ArticleCreateForm(@field:NotBlank val title: String, val categoryId: Long)
data class ArticleUpdateForm(override val id: Long, val title: String) : UpdateForm<Long>

// FormResolver
@Component
class ArticleFormResolver(...) : FormResolver1<...>() { ... }

// Service
@Service
class ArticleService(
    override val repo: ArticleRepository,
    override val formResolver: ArticleFormResolver,
) : BaseEntityService<Long, Article, ArticleCreateForm, ArticleUpdateForm> {
    override val tableName = "article"
}

// Controller
@RestController @RequestMapping("/articles")
class ArticleController(override val service: ArticleService)
    : BaseEntityController<...>() { ... }
```

## Build

```bash
./gradlew :module-jpa-mvc:build
```
