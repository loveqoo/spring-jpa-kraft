# module-jpa 설계

## Entity 계층

- `BaseEntity<ID>`: 모든 엔티티의 기반. audit 컬럼, equals/hashCode 제공. ID 타입은 제네릭(`ID : Comparable<ID>`)
  - `@Id`, `@GeneratedValue` 없음 → 하위 클래스에서 PK 전략 결정
- `AggregateRootBaseEntity<ID, A>`: `Identifiable<ID>`, `Traceable`, `OptimisticLockSupport`, `SoftDeletable` 구현. `AbstractAggregateRoot` 상속 없음 — KSP 호환성 확보
  - `@Id`, `@GeneratedValue` 없음 → 하위 클래스에서 PK 전략 결정
  - `@Version`으로 낙관적 락 — JPA가 자동 관리
  - `versionUp()`: `updatedAt = LocalDateTime.now()`로 dirty 유발 → 하위 엔티티 변경 시 aggregate version 증가 트리거
  - `delete()`: soft delete (`deleted = true`)
  - 도메인 이벤트: `@Transient private val _domainEvents` 리스트로 자체 관리. `@DomainEvents`/`@AfterDomainEventPublication` 어노테이션 기반 — `save()` 시 Spring Data가 자동 발행 + clear
  - `@Transient addDomainEvent(event)`: `_domainEvents`에 이벤트 추가
  - `@Transient getDomainEvents()`: 등록된 이벤트 조회 (주로 테스트용)
  - 모든 이벤트 관련 메서드에 `@Transient` 적용 — JPA가 컬럼으로 오해하지 않도록 방지
  - 하위 엔티티 변경 시 version 증가는 `BaseEntityService`의 lifecycle hook(`afterSave`/`beforeDelete`)으로 자동 처리 — `@Transactional` 메서드 내부에서 aggregate root `versionUp()` + `save` 수행

## type 패키지 (`spring.kraft.jpa.type`)

엔티티 관련 인터페이스 정의:
- `Identifiable<ID>`: `id`, `isNew` (순수 식별) + `unproxy()` 확장 함수. `ID : Comparable<ID>` 제약으로 `Long`, `UUID`, `String`, `ULID` 등 수용
- `Traceable`: audit 컬럼(`createdAt`, `createdBy`, `updatedAt`, `updatedBy`) + 컬럼명 상수
- `Checkable`: 커스텀 체크 로직 (`check()`)
- `OptimisticLockSupport`: 낙관적 락 (`versionNumber: Long`, `versionUp()`) + 컬럼명 상수
- `SoftDeletable`: soft delete (`deleted: Boolean`, `delete()`) + 컬럼명 상수
- `ParentIdAware<ID>`: 부모 엔티티 ID 참조 (`parentId()`)
- `AggregateRootAware<ID, E>`: 하위 엔티티가 자신의 Aggregate Root를 참조 (`aggregateRoot(): E`)
- 향후 추가 예정: 엔티티 복사, 특정 필드 기반 Ordering 등

## Repository

- Entity 기능 인터페이스에 대응하는 Repository도 함께 제공하여 기능을 확실히 지원
- `JpaSpecificationExecutor<E>`: 동적 검색 — JPA Specification 기반
- `SiblingsAwareRepository<E, P_ID>`: `ParentIdAware` 엔티티 대상, 같은 부모 ID를 가진 형제 엔티티 조회 (자기 자신 포함)

## 검색 (`spring.kraft.jpa.search`)

QueryDSL 대신 JPA `Specification` + Kotlin 확장으로 검색 기능 제공. `@QuerydslPredicate` 스타일(기본 EQ, 복수값 IN, 커스터마이징) 호환.

### 검색 파라미터 컨벤션

```
GET /api/orders?name=test              → name = 'test'        (기본 EQ)
GET /api/orders?name=a&name=b          → name IN ('a', 'b')   (복수값 → IN)
GET /api/orders?sort=name,asc          → ORDER BY name ASC    (Spring Data Pageable 표준)
```

날짜/시간 필드(`BETWEEN` 바인딩):
```
GET /api/orders?createdAt=2025-01-01T00:00:00&createdAt=2025-12-31T23:59:59
  → created_at BETWEEN '2025-01-01 00:00:00' AND '2025-12-31 23:59:59'
```
- `BETWEEN`은 **반드시 같은 파라미터명으로 값 2개**를 전달해야 함 (시작, 끝)
- 값이 1개만 전달되면 해당 조건은 **무시됨** (에러 없이 조건 미적용)

### 핵심 클래스

- `SearchOp`: 검색 연산자 (`EQ`, `LIKE`, `GTE`, `LTE`, `BETWEEN`, `IS_NULL`)
- `SearchBinder<E>`: 필드별 연산자 바인딩 DSL. `bind("name").to(SearchOp.LIKE)`, `excluding("password")`, `allowUnboundFields()`. 기본적으로 `bind()`로 등록된 필드만 검색 허용 (화이트리스트). `allowUnboundFields()` 호출 시 미등록 필드도 기본 EQ로 허용
- `SearchFieldProvider<E>`: 엔티티별 검색 설정 인터페이스. `customize(binder)` + `defaultSort()`
- `SearchSpecBuilder`: `Map<String, List<String>>` + `SearchFieldProvider` → `Specification<E>?` 변환. `page`/`size`/`sort` 파라미터 자동 제외

### 타입 변환

`SearchSpecBuilder`가 JPA `Path.javaType` 기반으로 String → 적절한 타입 자동 변환 (`Long`, `Int`, `BigDecimal`, `LocalDateTime` 등)

### 사용 예시

```kotlin
@Component
class OrderSearchFields : SearchFieldProvider<Order> {
    override fun customize(binder: SearchBinder<Order>) {
        binder.bind("name").to(SearchOp.LIKE)
        binder.bind("amount").to(SearchOp.GTE)
    }
    override fun defaultSort(): Sort = Sort.by(Sort.Direction.DESC, "createdAt")
}
```

## 동등성(equals/hashCode) 전략

- 영속 상태 (`isNew == false`): `id` 기반 비교
- 비영속 상태 (`isNew == true`): `EntityHelper.transientEquals()`로 `@IdentityColumn` 마킹된 필드 기반 비교
- Hibernate 프록시 고려하여 `Hibernate.getClass()`로 타입 비교

## EntityHelper.compareTo()

- `check(!e1.isNew && !e2.isNew)` — 둘 다 영속 상태일 때만 id 비교 허용

## DataSource 라우팅 (`spring.kraft.jpa.datasource`)

- Master/Slave DataSource 자동 라우팅 — `@Transactional(readOnly = true)` 기반
- `DataSourceRoutingProperties`: `kraft.datasource.master`/`slaves` YAML 설정 바인딩 (`HikariConfig` 직접 사용)
- `ReadOnlyRoutingDataSource`: `AbstractRoutingDataSource` 구현. readOnly 트랜잭션 → slave (round-robin), 쓰기 → master
- `DataSourceRoutingAutoConfiguration`: `@AutoConfiguration` + `@ConditionalOnProperty("kraft.datasource.master.jdbc-url")` — 설정 없으면 Spring Boot 기본 DataSource 유지
- 구조: `LazyConnectionDataSourceProxy` → `ReadOnlyRoutingDataSource` → master/slave `HikariDataSource`
- `LazyConnectionDataSourceProxy`로 Connection 획득을 지연하여 `TransactionSynchronizationManager.isCurrentTransactionReadOnly()` 설정 후 라우팅 결정
