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
- `DynamicSearchRepository<ID, T>`: 모든 엔티티의 공통 검색 인터페이스. `Map<String, String>`으로 동적 where 조건 구성 (인접 테이블 조인 검색 포함)
- `SiblingsAwareRepository<E, P_ID>`: `ParentIdAware` 엔티티 대상, 같은 부모 ID를 가진 형제 엔티티 조회 (자기 자신 포함)
- `JPQLQuery<T>.fetchPage()`: QueryDSL 페이징 헬퍼 확장 함수. count 쿼리를 pagination 적용 전에 실행
- QueryDSL: OpenFeign fork (`io.github.openfeign.querydsl:querydsl-jpa:7.x`) + KSP 기반 코드 생성 (`querydsl-ksp-codegen`). Jakarta 전용

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
