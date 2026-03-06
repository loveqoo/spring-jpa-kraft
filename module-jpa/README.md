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

Base class for aggregate roots. Implements `Identifiable`, `Traceable`, `OptimisticLockSupport`, and `SoftDeletable`. Does **not** extend `AbstractAggregateRoot` -- uses its own `@Transient` event collection with `@DomainEvents`/`@AfterDomainEventPublication` for KSP compatibility.

- `@Version` optimistic locking -- managed automatically by JPA
- `versionUp()` -- touches `updatedAt` to trigger dirty detection and version increment
- `delete()` -- soft delete (`deleted = true`)
- `addDomainEvent(event)` -- adds to internal `@Transient` event list
- `getDomainEvents()` -- returns registered events (mainly for testing)
- `@DomainEvents domainEvents()` / `@AfterDomainEventPublication clearDomainEvents()` -- Spring Data auto-publishes on `save()` and clears afterwards
- All event-related methods annotated with `@Transient` to prevent JPA from interpreting them as column accessors

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
| `SiblingsAwareRepository<E, P_ID>` | `ParentIdAware` | Query sibling entities sharing the same parent |

### Search (`spring.kraft.jpa.search`)

JPA `Specification`-based search with `@QuerydslPredicate`-compatible conventions (default EQ, multi-value IN, per-field customization).

| Class | Purpose |
|---|---|
| `SearchOp` | Search operators: `EQ`, `LIKE`, `GTE`, `LTE`, `BETWEEN`, `IS_NULL` |
| `SearchBinder<E>` | DSL for per-field operator binding |
| `SearchFieldProvider<E>` | Entity-specific search config: `customize(binder)` + `defaultSort()` |
| `SearchSpecBuilder` | `Map<String, List<String>>` + provider → `Specification<E>?` |

**BETWEEN convention** (date/time fields): Pass the same parameter name twice — `?createdAt=<from>&createdAt=<to>`. If only one value is provided, the condition is silently ignored.

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

## DataSource Routing

Auto-configuration for master/slave DataSource routing based on `@Transactional(readOnly = true)`.

### Structure

```
LazyConnectionDataSourceProxy          ← delays Connection acquisition
└── ReadOnlyRoutingDataSource          ← AbstractRoutingDataSource
    ├── master: HikariDataSource       ← write transactions
    └── slaves: HikariDataSource[]     ← read-only transactions (round-robin)
```

`LazyConnectionDataSourceProxy` defers the actual JDBC connection until a statement is executed,
ensuring `TransactionSynchronizationManager.isCurrentTransactionReadOnly()` is set before routing.

### Activation

The auto-configuration activates only when `kraft.datasource.master.jdbc-url` is present.
Without it, Spring Boot's default DataSource behavior is preserved.

### YAML Configuration

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
      - jdbc-url: jdbc:mysql://slave2:3306/db
        username: reader
        maximum-pool-size: 5
```

Properties bind directly to `HikariConfig`, so all HikariCP options (`jdbc-url`, `username`, `password`, `maximum-pool-size`, etc.) are available via Spring Boot relaxed binding.

## Build

```bash
./gradlew :module-jpa:build
```

Runs ktlint code style checks and tests alongside the build.
