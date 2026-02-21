# module-jpa

An abstraction layer for Spring JPA entities and repositories.
Entity capabilities are composed by combining type interfaces.

## Core Concept

Each entity capability is defined as an **interface**, and base classes implement them.
To add a new capability, define an interface and optionally provide a corresponding repository.

```
Identifiable ─┐
               ├─ BaseEntity (audit, equals/hashCode)
Traceable ─────┘

Identifiable ──────────┐
Traceable ─────────────┤
OptimisticLockSupport ─┼─ AggregateRootBaseEntity (all above + domain events)
SoftDeletable ─────────┘
```

## Type Interfaces

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

## Base Entities

### BaseEntity\<ID\>

Base class for general entities. Implements `Identifiable` + `Traceable`.

- `@MappedSuperclass` -- no `@Id` or `@GeneratedValue` (subclasses decide PK strategy)
- `@EntityListeners(AuditingEntityListener)` -- Spring Auditing integration
- `equals`/`hashCode` -- id-based when persisted, `@IdentityColumn`-based when transient

### AggregateRootBaseEntity\<A, ID\>

Base class for aggregate roots. Extends `AbstractAggregateRoot<A>` and adds `OptimisticLockSupport` + `SoftDeletable`.

- `@Version` optimistic locking -- managed automatically by JPA
- `versionUp()` -- touches `updatedAt` to trigger dirty detection and version increment
- `delete()` -- soft delete (`deleted = true`)
- Domain event publishing via `registerEvent()`

## Equality Strategy

| State | Comparison |
|---|---|
| Persisted (`isNew == false`) | id-based |
| Transient (`isNew == true`) | `@IdentityColumn`-annotated fields via reflection |

Place `@IdentityColumn` on the getter of properties that serve as business keys.
Type comparison uses `Hibernate.getClass()` for proxy safety.

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

## Repositories

Repositories are provided to match entity type interfaces.

| Repository | Paired Interface | Purpose |
|---|---|---|
| `DynamicSearchRepository<ID, T>` | -- | Dynamic search via `Map<String, String>` |
| `SiblingsAwareRepository<E, P_ID>` | `ParentIdAware` | Query sibling entities sharing the same parent |

### QueryDSL Helper

```kotlin
fun <ID : Comparable<ID>, T : Identifiable<ID>> JPQLQuery<T>.fetchPage(
    querydsl: Querydsl,
    pageable: Pageable,
): Page<T>
```

Executes the count query before applying pagination to guarantee an accurate total count.

## EntityHelper

| Method | Purpose |
|---|---|
| `compareTo(e1, e2): Result<Int>` | id-based comparison; fails if either entity is transient |
| `transientEquals(o1, o2)` | Equality based on `@IdentityColumn` fields |
| `transientHashCode(e1)` | Hash code based on `@IdentityColumn` fields |

## How to Extend

1. Define an interface in `spring.kraft.jpa.type`
2. Optionally add a corresponding repository interface in `spring.kraft.jpa.repo`
3. Compose into a base entity or implement directly in concrete entities

```kotlin
// 1. Define the interface
interface Orderable {
    val sortOrder: Int
}

// 2. Provide a corresponding repository
interface OrderableRepository<E : Orderable> {
    fun findAllOrdered(): List<E>
}

// 3. Compose in the entity
@Entity
class MenuItem(
    @get:IdentityColumn val name: String,
    override val sortOrder: Int,
) : BaseEntity<Long>(), Orderable {
    @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
    override var id: Long? = null
}
```

## Build

```bash
./gradlew :module-jpa:build
```

Runs ktlint code style checks and tests alongside the build.
