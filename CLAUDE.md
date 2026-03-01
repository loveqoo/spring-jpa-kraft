# CLAUDE.md

## 프로젝트 개요

- Spring JPA 기반 **라이브러리** 프로젝트 — Application main class 없음, bootJar 불필요

## 프로젝트 구조

- `module-core`: 공통 모듈 (`Result<T>` 확장 함수 — `flatMap`, `zip`)
- `module-jpa`: JPA 관련 기반 코드 (Entity, Repository, EntityHelper 등)
- `module-mvc`: Spring MVC 모듈 (FormResolver 계층, UpdateForm, Service 계층, Controller 계층)
- `module-ksp-annotations`: KSP 어노테이션 모듈 (`@KraftAggregate` 등). 순수 Kotlin — 프레임워크 의존성 없음
- `module-ksp-processor`: KSP 프로세서 모듈. `module-ksp-annotations` + KSP API 의존. 타입 안전 ID + InternalMediator 코드 생성
- `module-ddl-parser`: MySQL DDL 파서 + Entity 코드 생성 모듈. ANTLR4(`MySQLLexer`/`MySQLParser`)로 `.sql`을 직접 파싱하여 `TableSchema`를 만들고 Aggregate 설정 JSON과 결합해 Entity `.kt` 파일 생성
- `buildSrc`: Gradle 빌드 설정

## 빌드

- `./gradlew :module-core:build` — module-core 빌드
- `./gradlew :module-jpa:build` — module-jpa 빌드
- `./gradlew :module-mvc:build` — module-mvc 빌드
- `./gradlew :module-ksp-annotations:build` — module-ksp-annotations 빌드
- `./gradlew :module-ksp-processor:build` — module-ksp-processor 빌드
- `./gradlew :module-ddl-parser:build` — module-ddl-parser 빌드
- ktlint가 check 태스크에 포함되어 있으므로 빌드 시 자동으로 코드 스타일 검사됨

## 아키텍처 결정 사항

### module-jpa 설계

**Entity 계층:**
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

**type 패키지** (`spring.kraft.jpa.type`): 엔티티 관련 인터페이스 정의
- `Identifiable<ID>`: `id`, `isNew` (순수 식별) + `unproxy()` 확장 함수. `ID : Comparable<ID>` 제약으로 `Long`, `UUID`, `String`, `ULID` 등 수용
- `Traceable`: audit 컬럼(`createdAt`, `createdBy`, `updatedAt`, `updatedBy`) + 컬럼명 상수
- `Checkable`: 커스텀 체크 로직 (`check()`)
- `OptimisticLockSupport`: 낙관적 락 (`versionNumber: Long`, `versionUp()`) + 컬럼명 상수
- `SoftDeletable`: soft delete (`deleted: Boolean`, `delete()`) + 컬럼명 상수
- `ParentIdAware<ID>`: 부모 엔티티 ID 참조 (`parentId()`)
- `AggregateRootAware<ID, E>`: 하위 엔티티가 자신의 Aggregate Root를 참조 (`aggregateRoot(): E`)
- 향후 추가 예정: 엔티티 복사, 특정 필드 기반 Ordering 등

**Repository:**
- Entity 기능 인터페이스에 대응하는 Repository도 함께 제공하여 기능을 확실히 지원
- `DynamicSearchRepository<ID, T>`: 모든 엔티티의 공통 검색 인터페이스. `Map<String, String>`으로 동적 where 조건 구성 (인접 테이블 조인 검색 포함)
- `SiblingsAwareRepository<E, P_ID>`: `ParentIdAware` 엔티티 대상, 같은 부모 ID를 가진 형제 엔티티 조회 (자기 자신 포함)
- `JPQLQuery<T>.fetchPage()`: QueryDSL 페이징 헬퍼 확장 함수. count 쿼리를 pagination 적용 전에 실행
- QueryDSL: OpenFeign fork (`io.github.openfeign.querydsl:querydsl-jpa:7.x`) + KSP 기반 코드 생성 (`querydsl-ksp-codegen`). Jakarta 전용

**동등성(equals/hashCode) 전략:**
- 영속 상태 (`isNew == false`): `id` 기반 비교
- 비영속 상태 (`isNew == true`): `EntityHelper.transientEquals()`로 `@IdentityColumn` 마킹된 필드 기반 비교
- Hibernate 프록시 고려하여 `Hibernate.getClass()`로 타입 비교

**EntityHelper.compareTo():**
- `check(!e1.isNew && !e2.isNew)` — 둘 다 영속 상태일 때만 id 비교 허용

**DataSource 라우팅** (`spring.kraft.jpa.datasource`):
- Master/Slave DataSource 자동 라우팅 — `@Transactional(readOnly = true)` 기반
- `DataSourceRoutingProperties`: `kraft.datasource.master`/`slaves` YAML 설정 바인딩 (`HikariConfig` 직접 사용)
- `ReadOnlyRoutingDataSource`: `AbstractRoutingDataSource` 구현. readOnly 트랜잭션 → slave (round-robin), 쓰기 → master
- `DataSourceRoutingAutoConfiguration`: `@AutoConfiguration` + `@ConditionalOnProperty("kraft.datasource.master.jdbc-url")` — 설정 없으면 Spring Boot 기본 DataSource 유지
- 구조: `LazyConnectionDataSourceProxy` → `ReadOnlyRoutingDataSource` → master/slave `HikariDataSource`
- `LazyConnectionDataSourceProxy`로 Connection 획득을 지연하여 `TransactionSynchronizationManager.isCurrentTransactionReadOnly()` 설정 후 라우팅 결정

### module-core 설계

**Result 확장 함수** (`spring.kraft.core.ResultExtensions`):
- `flatMap`: 성공 시 변환 함수 적용, 실패 시 원본 실패 전파
- `zip` (2~5인자): 여러 `Result`를 조합. 인자가 호출 전에 모두 평가됨 (eager). 하나라도 실패하면 해당 실패 전파
- `zipLazy` (2~5인자): `zip`과 동일 조합 로직이지만 인자를 `() -> Result<U>` 람다로 받아 lazy evaluation 보장. 앞 단계 실패 시 뒤 람다 미실행
- 프레임워크 의존성 없는 순수 Kotlin 코드

### module-mvc 설계

**FormResolver 계층** (`spring.kraft.form`):
- Form → Entity 변환 파이프라인: 검증(`Validator`) → 부모 엔티티 조회 → 생성/수정
- 모든 단계가 `Result<T>`로 합성되어 실패 시 short-circuit
- `FormResolver<ID, E, CF, UF>`: 추상 기반. validation + `toEntity()` 템플릿 제공
- `FormResolver0`: 부모 없는 엔티티. `createEntity()` + `update()` 구현
- `FormResolver1`: 1개 부모 엔티티 참조. `flatMap` 체이닝으로 lazy evaluation
- `FormResolver2~4`: 2~4개 부모 엔티티 참조. `zipLazy`로 부모 조회를 합성하여 가독성과 lazy evaluation 모두 확보
  - CF의 `parentId()` → `Result<P_ID>` (필수)
  - UF의 `parentId()` → `Result<P_ID?>` (선택 — null이면 null 부모 전달)
  - 부모 조회: `repo.getReferenceById()` + `unproxy()`로 Hibernate 프록시 안전 처리
  - 앞 단계 실패 시 후속 부모 조회 short-circuit (DB 접근 방지)
- `transform()`: 엔티티 로딩 후 공통 로직 적용 hook (기본값: identity)

**UpdateForm\<ID\>** (`spring.kraft.form`):
- 수정 폼 인터페이스. `val id: ID`로 대상 엔티티 식별
- `Companion` 유틸리티: 값이 실제로 변경된 경우에만 setter 호출하여 불필요한 dirty detection 방지
  - `updateEntity()`: 엔티티 참조 변경 (ID 비교)
  - `updateProperty()`: 단순 값 비교 후 변경
  - `updateProperty(raw, supplier, setter)`: 변환 후 비교

**Service 계층** (`spring.kraft.service`):
- 모든 서비스가 interface default method로 구현 — 구현 클래스에서 `repo`, `formResolver` 등만 제공하면 됨
- `ReadOnlyService<ID, E>`: 읽기 전용 CRUD + transformer 오버로드
  - `findById`: nullable 반환 (`E?`, `T?`) — 존재하지 않으면 `null`
  - `getOne`: non-null 반환 (`E`, `T`) — `getReferenceById` 위임, 존재하지 않으면 예외
- `BaseEntityService<ID, E, CF, UF>`: `ReadOnlyService` 확장. FormResolver 기반 `create`/`update`/`delete`
  - `create`/`update` 시 `formResolver.run { request.toEntity() }` → `repo.save()` → `Checkable`이면 `check()` → `afterSave()` 호출
  - `delete` 시 `beforeDelete()` → `repo.deleteById()` 순서로 실행
  - `afterSave(entity)` / `beforeDelete(id)`: lifecycle hook — `AggregateRootAware` 엔티티면 `aggregateRootAwareServices`에 `publishEvent` 호출. `@Transactional` 메서드 내부에서 실행되어 트랜잭션 원자성 보장
  - `aggregateRootAwareServices`: `List<AggregateRootAwareService<*, *, *>>` (기본값 `emptyList()`) — 구현 클래스에서 주입하면 자동 연동
  - Result 파이프라인 결과를 `getOrThrow()`로 언래핑 — 실패 시 예외 전파
- `SearchableEntityService<ID, E, R, CF, UF>`: `BaseEntityService` 확장. `R`이 `QuerydslPredicateExecutor` + `DynamicSearchRepository` 구현 필요
  - `search(predicate, pageable)`: QueryDSL Predicate 기반 검색
  - `searchCustom(params, pageable)`: `Map<String, String>` 기반 동적 검색
- `RevisionEntityService<ID, E, R, CF, UF>`: `BaseEntityService` 확장. `R`이 `RevisionRepository` 구현 필요
  - `findRevisions(id)`: Envers 리비전 목록 조회
  - `findRevisionPages(id, pageable)`: 페이징된 리비전 조회
- `SearchableRevisionEntityService<ID, E, R, CF, UF>`: `SearchableEntityService` + `RevisionEntityService` 결합
- `AggregateRootAwareService<ID, E, RE>`: Aggregate Root 이벤트 발행
  - `entityType: Class<E>` 필수 — 런타임 타입 검사로 다른 aggregate 계층의 엔티티를 안전하게 무시
  - `publishEvent(entity)`: `entityType.isInstance(entity)`로 정확한 타입 검사 후 `aggregateRoot()` → `versionUp()` → `addDomainEvent(AggregateRootVersionUpEvent)` → `save`
  - root/entity의 `id`가 null(비영속)이면 early return — NPE 방지
  - `save()` 시점에 Spring Data가 `@DomainEvents` 어노테이션을 감지하여 이벤트를 자동 발행 + `@AfterDomainEventPublication`으로 clear — 리스너에서 Redis 동기화 등 사이드이펙트 처리 가능

**Event** (`spring.kraft.service.event`):
- `AggregateRootVersionUpEvent<ID>`: Aggregate Root의 version이 증가할 때 발행되는 도메인 이벤트
  - `aggregateRootId: ID` — 대상 aggregate root의 식별자
  - `aggregateRootType: Class<*>` — 리스너가 특정 aggregate 타입만 필터 가능
  - `sourceEntityId: Any` — version 증가를 유발한 하위 엔티티의 식별자
  - `sourceEntityType: Class<*>` — 원인 엔티티 타입 (리스너에서 원인 추적 가능)
  - `addDomainEvent()`로 등록 → `save()` 시 Spring Data가 자동 발행 + clear
  - 이벤트 흐름: `BaseEntityService.afterSave`/`beforeDelete` → `AggregateRootAwareService.publishEvent()` → `versionUp()` + `addDomainEvent(AggregateRootVersionUpEvent)` → `save()` → Spring Data 이벤트 발행 → `@EventListener`/`@TransactionalEventListener`에서 처리


**Controller 계층** (`spring.kraft.controller`):
- Controller → Delegator → Service 3계층 구조
- **Controller**: URL 매핑만 담당, 모든 호출을 delegator에 위임. 자신이 Mapper를 구현하여 delegator에 `this`로 전달
  - `ReadOnlyEntityController<ID, E, S, D>`: 읽기 전용. `list(pageable)`, `getOne(id)`. `ReadOnlyMapper` 구현
  - `BaseEntityController<ID, E, S, D, CF, UF>`: CRUD. `createOne`, `updateOne`, `delete` 추가. `BaseEntityMapper` 구현
  - `SearchableEntityController<..., R>`: QueryDSL/동적 검색 추가
  - `RevisionEntityController<..., R>`: Envers 리비전 조회 추가. `RevisionEntityMapper` 구현
  - `SearchableRevisionEntityController<..., R>`: Searchable + Revision 결합
- **Delegator**: 실제 로직 담당 — mapper를 통한 DTO 변환, Errors 검증, service 호출
  - `ReadOnlyDelegator`: service에 `mapper::toReadDto` transformer 전달하여 Page/단건 DTO 변환
  - `BaseEntityDelegator`: `Errors.hasErrors()` 검사 → `ValidationException` throw, `mapper.toCreateDto/toUpdateDto/toDeleteDto` 반환
  - `SearchableEntityDelegator`: predicate null 시 `findAll` fallback, customParams 지원
  - `RevisionEntityDelegator`: `mapper::toRevisionDto` transformer 전달
  - `SearchableRevisionEntityDelegator`: Searchable + Revision 결합
- **예외 처리** (`spring.kraft.controller.exception`):
  - `FormValidationException`: `ValidationException` 확장, `List<ObjectError>`를 직접 운반하여 구조화된 에러 접근 가능
  - `ErrorResponse` / `FieldErrorDetail`: 일관된 에러 응답 구조 (`status`, `error`, `message`, `details`)
  - `DefaultExceptionHandler`: `@ControllerAdvice @Order(LOWEST_PRECEDENCE)` — 사용자가 더 높은 우선순위의 핸들러로 오버라이드 가능
    - `FormValidationException` → 400 (FieldError/ObjectError 분기, details 포함)
    - `ConstraintViolationException` → 400 (Bean Validation 위반, propertyPath/message 매핑)
    - `EntityNotFoundException` → 404
- **DTO** (`spring.kraft.controller.dto`):
  - `MutationResponse`: CUD 작업의 공통 응답 DTO (`action`, `id`, `name`). `Serializable` 구현. `Companion`에 `create`/`update`/`delete` 팩토리 메서드 제공
- **Mapper** 인터페이스: Controller가 직접 구현
  - `ReadOnlyMapper<ID, E, D>`: `toReadDto(entity): D`
  - `BaseEntityMapper<ID, E, D>`: `toCreateDto(entity): MutationResponse`, `toUpdateDto(entity): MutationResponse`, `toDeleteDto(id): MutationResponse`
  - `RevisionEntityMapper<ID, E, D>`: `toRevisionDto(entity): D`
- **Action** 인터페이스: Controller가 반드시 구현해야 하는 HTTP 엔드포인트 스펙
  - `ReadOnlyAction`/`BaseEntityAction`/`SearchableEntityAction`/`RevisionEntityAction`/`SearchableRevisionEntityAction`
- **ActionExtend** 인터페이스: Delegator가 제공하는 공통 확장 기능의 계약
  - `*ActionExtend`: `<T : Any> transformer` 오버로드 — Delegator에 한 번 구현되어 여러 Controller에서 재사용
  - Controller는 ActionExtend를 몰라도 되지만, 필요하면 `delegator`를 통해 확장 기능에 접근 가능
  - 비슷한 타입의 Controller가 각각 공통 확장 로직을 중복 구현하는 것을 방지
- **설계 의도**: Controller는 `abstract class`로 상속하여 `service`, `tableName`, mapper 메서드만 구현하면 CRUD 엔드포인트 자동 완성. `delegator`는 `by lazy`로 지연 초기화

### module-ksp-annotations 설계

**`CommonMethod`** — Mediator 공통 메서드 enum
- `FIND_BY_ID`, `GET_ONE`, `FIND_ALL`, `CREATE`, `UPDATE`, `DELETE`
- `@KraftAggregate(exclude = [...])` 에서 사용하여 특정 공통 메서드를 Mediator에서 제외

**`@KraftExpose`** — 메서드 레벨 어노테이션. 서비스의 커스텀 메서드를 Mediator에 노출
- `name: String = ""` — 빈 문자열이면 기본 네이밍 규칙 적용 (동사 접두사 감지 후 엔티티명 삽입)
- `@Retention(SOURCE)` — 컴파일 타임 전용
- `suspend` 함수 지원 — `suspend` 키워드가 인터페이스/AggregateMediator에 그대로 전파

**`@KraftAggregate(root, exclude, mediatorPackage)`** — 서비스 클래스에 부착하여 Aggregate Root를 지정
- `root`: Aggregate Root 엔티티 클래스 참조. 같은 root를 지정한 서비스들이 하나의 Mediator로 그룹화
- `exclude: Array<CommonMethod> = []` — Mediator에서 제외할 공통 메서드 목록
- `mediatorPackage: String = ""` — 빈 문자열이면 기본 규칙(`{basePackage}.mediator`) 적용. 같은 root 그룹 내 충돌 시 에러 + Mediator 미생성
- `@Retention(SOURCE)` — 컴파일 타임에만 사용, 런타임에 없음

### module-ksp-processor 설계

**KSP 코드 생성 흐름:**
1. `@KraftAggregate` 어노테이션이 붙은 서비스 클래스 스캔
2. `findSupertypeArgs()`로 supertype 체인 순회하여 `BaseEntityService` 또는 `ReadOnlyEntityService` 탐지 + 타입 파라미터 추출
   - 중간 추상 클래스가 끼어도 제네릭 타입 치환을 정확히 수행 (`buildTypeParamMapping` + `substituteType`)
   - 예: `ConcreteService : AbstractService<Long, Order>` → `AbstractService<ID, E> : BaseEntityService<ID, E, CF, UF>` — ID→Long, E→Order 치환
3. `exclude`, `mediatorPackage` 파라미터 추출 + `@KraftExpose` 메서드 스캔 (`suspend` 함수 포함)
4. `root` 기준으로 그룹화
5. `mediatorPackage` 충돌 감지 — 같은 root 그룹 내 서로 다른 값이면 `logger.error()` + 해당 그룹 Mediator 미생성
6. 그룹별 타입 안전 ID value class + InternalMediator 코드 생성 (공통 메서드 제외 + 커스텀 메서드 포함)

**패키지 배치 규칙:**
- root 엔티티 패키지에서 마지막 세그먼트를 제거하여 기반 패키지 결정 (예: `com.example.order.entity.OrderRoot` → `com.example.order`)
- ID 클래스: `{기반패키지}.id` (예: `com.example.order.id.OrderRootId`)
- Mediator: `{기반패키지}.mediator` (예: `com.example.order.mediator.OrderRootInternalMediator`)

**`TypedIdGenerator`** — 엔티티별 타입 안전 ID 생성:
- `@JvmInline value class {EntityName}Id(val value: {PrimitiveId})` + `Comparable` 구현
- 확장 함수 `{PrimitiveId}.to{EntityName}Id()` 포함
- 잘못된 ID 타입 전달을 컴파일 타임에 차단
- 중복 생성 방지 키에 `idType` FQN 포함 — 같은 entityName + 다른 ID 타입도 정확히 구분

**`InternalMediatorGenerator`** — 인터페이스/구현 분리 Mediator 코드 생성:
- **인터페이스 분리 원칙**: 각 엔티티별 `{E}InternalMediator` 인터페이스 + 하나의 `{Root}AggregateMediator` open 클래스
- **인터페이스** (`{E}InternalMediator`): 해당 엔티티 입장에서 Aggregate 내 *다른* 엔티티의 **조회 메서드만** 선언 (body 없음)
  - 포함: `find{OtherE}ById`, `getOne{OtherE}`, `findAll{OtherE}` + `@KraftExpose` 커스텀 메서드
  - 제외: CUD(create/update/delete) — 각 서비스가 자체 처리
  - 단일 엔티티 Aggregate → 빈 인터페이스 (다른 엔티티 없음)
- **AggregateMediator** (`{Root}AggregateMediator`): 모든 인터페이스 구현, `open class`, `@Component` 없음
  - 생성자에 모든 서비스 `@Lazy protected val`로 주입 — 순환 의존성 방지 + 사용자가 상속하여 접근 가능
  - `override fun` + 서비스 위임 (`id.value`로 타입 ID 언래핑)
  - 사용자가 상속하여 `@Component` 부착 + 자유 확장
- **사용 패턴**: 각 서비스는 자신의 `{E}InternalMediator` 타입으로 주입받아 다른 엔티티 조회 접근
- **`exclude` 어노테이션**: `FIND_BY_ID`, `GET_ONE`, `FIND_ALL`만 유효. `CREATE`/`UPDATE`/`DELETE`는 mediator 대상 아니므로 무시
- **커스텀 메서드 생성**: `@KraftExpose` 메서드를 인터페이스에 선언 + AggregateMediator에 override 구현
  - `suspend` 함수 지원 — `suspend` 키워드가 인터페이스 선언과 AggregateMediator override 양쪽에 그대로 전파
  - 네이밍: `overrideName` 있으면 그대로, 없으면 동사 접두사 감지 후 엔티티명 삽입 (예: `findByStatus` + `Order` → `findOrderByStatus`)
  - 동사 미감지 시: `{entityName(소문자)}{OriginalName(대문자)}` (예: `customLogic` → `orderCustomLogic`)
  - 파라미터/반환 타입을 재귀적으로 렌더링 (`renderType()` — simple name + 제네릭 + nullable)
- **패키지 override**: `mediatorPackageOverride`가 지정되면 해당 패키지에 생성
- **import 최적화**: `Page`/`Pageable`은 `findAll`이 사용되는 entry가 있을 때만 import. 커스텀 메서드 타입도 자동 수집 (`kotlin.*`, `java.lang.*` 제외)

**`CustomMethodEntry`** — `@KraftExpose` 메서드 메타데이터:
- `declaration: KSFunctionDeclaration` — 원본 함수 선언
- `overrideName: String` — 빈 문자열이면 기본 네이밍 적용
- `isSuspend: Boolean` — `suspend` 함수 여부

**`ServiceEntry`** — 어노테이션에서 추출한 서비스 메타데이터:
- `classDeclaration`, `rootType`, `entityName`, `idType`, `entityType`
- `createFormType?`, `updateFormType?` — `BaseEntityService`일 때만
- `isMutable` — `BaseEntityService` 구현 여부
- `excludedMethods: Set<String>` — `CommonMethod` enum name 문자열 집합
- `customMethods: List<CustomMethodEntry>` — `@KraftExpose` 메서드 목록
- `mediatorPackage: String` — 빈 문자열이면 기본 패키지 규칙 적용

**테스트:** `kotlin-compile-testing-ksp` (kctfork) 라이브러리로 KSP 컴파일 테스트
- 테스트용 서비스 인터페이스 스텁 포함, 생성된 파일 존재 + 내용 검증

### module-ddl-parser 설계

**목적:** DDL 기반 코드 생성 파이프라인의 파싱 단계. MySQL DDL(`.sql`)을 ANTLR4로 직접 파싱해 내부 데이터 모델을 만들고, Aggregate 설정(JSON)과 결합해 Entity 코드를 생성

**입력:** SQL 파일 + Aggregate Config JSON

**데이터 모델** (`spring.kraft.ddl`):
- `TableSchema`: 테이블 목록
- `TableDef`: 이름, 스키마, 컬럼 목록, 인덱스 목록
- `TableColumn`: 이름, 타입명(`typeName`), 타입값(`typeValue`), pk, notNull, unique, autoIncrement, defaultValue, note
- `TableIndex`: 이름, 컬럼 목록, unique, pk

**ANTLR 문법** (`src/main/antlr/`):
- `MySQLLexer.g4`: 커스텀 경량 문법. 15개 SQL 키워드 토큰(PRIMARY, KEY, UNIQUE, INDEX, FOREIGN, REFERENCES, CHECK\_, CONSTRAINT, NULL\_, DEFAULT, AUTO\_INCREMENT, COMMENT\_, ASC, DESC, USING) + IDENTIFIER/BACKTICK\_ID/NUMBER/STRING\_LITERAL. 대소문자 무시(case-insensitive fragments)
- `MySQLParser.g4`: CREATE TABLE 구조적 파싱. 핵심 규칙:
  - `createTableStatement`: `CREATE TABLE tableName LPAREN tableElement (COMMA tableElement)* RPAREN tableOption* SEMI?`
  - `tableElement`: `primaryKeyConstraint | uniqueConstraint | indexDefinition | foreignKeyConstraint | checkConstraint | constraintWithName | columnDefinition` — ANTLR ALL(\*) 예측으로 disambiguation
  - `columnDefinition`: `identifier dataType columnAttribute*` — labeled alternatives(`#notNullAttr`, `#primaryKeyAttr`, `#uniqueAttr`, `#autoIncrementAttr`, `#defaultAttr` 등)로 타입 안전 visitor 패턴
  - `constraintBody`: labeled alternatives(`#constraintPK`, `#constraintUnique`, `#constraintFK`, `#constraintCheck`)
  - `indexColumn`: `identifier (LPAREN NUMBER RPAREN)? sortDirection?` — 컬럼 prefix 길이 + ASC/DESC 정렬 방향 지원
  - `indexOption`: `USING identifier | COMMENT_ STRING_LITERAL | ...` — 인덱스 옵션(`USING BTREE` 등) catch-all. PK/UNIQUE/INDEX 규칙에 `indexOption*`로 부착
  - `tableOption`: `~(SEMI | CREATE) | CREATE ~TABLE` — 세미콜론 없는 연속 CREATE TABLE 경계를 정확히 인식
  - `otherStatement`: `CREATE TABLE` 이외의 문(INSERT, ALTER, DROP 등) 무시
  - `identifier`: `IDENTIFIER | BACKTICK_ID` — 키워드는 백틱 인용 시에만 식별자로 사용 가능 (MySQL 예약어 규칙과 일치)
  - `columnAttrToken`: 미지원 컬럼 속성을 안전하게 소비하는 catch-all (UNSIGNED, ON UPDATE, GENERATED 등)
- Base 클래스: `MySQLLexerBase.java`, `MySQLParserBase.java` — 확장 포인트용 빈 스텁

**파서** (`DdlParser`, `CreateTableVisitor`):
- `DdlParser.parse(sqlFile: File)`: ANTLR Lexer/Parser를 통해 SQL 파싱 후 `CreateTableVisitor`로 `TableSchema` 구성
  - 커스텀 `BaseErrorListener`로 ANTLR 구문 에러 수집 — 기본 stderr 리스너 제거, 구문 에러 시 `IllegalArgumentException("DDL syntax error(s)")` throw. 에러 메시지에 SQL 문맥 포함 (에러 라인 ± 1줄 + `>>>` 표시 + `^` 위치 지시자)
  - visitor 레벨 파싱 에러도 별도 수집 — `IllegalArgumentException("DDL parse failed")` throw
- `CreateTableVisitor`: ANTLR parse tree 직접 순회로 테이블/컬럼/인덱스 추출
  - `visitCreateTableStatement()`: `ctx.tableName()`, `ctx.tableElement()` 등 구조적 접근
  - 컬럼 속성: `when (attr) { is NotNullAttrContext → ..., is PrimaryKeyAttrContext → ... }` 패턴 매칭
  - 제약조건: `ctx.primaryKeyConstraint()`, `ctx.uniqueConstraint()`, `ctx.indexDefinition()` 등 ANTLR 컨텍스트 직접 방문
  - `CONSTRAINT name ...` 형식: `constraintBody` labeled alternatives로 분기
  - FK/CHECK 제약은 인식하되 무시 (컬럼으로 오파싱 방지)
  - `pk=true`면 `notNull=true` 보장

**Aggregate 설정** (`spring.kraft.ddl.config`):
- `AggregateConfig`: 설정 최상위 (`basePackage`, `aggregates`, `idStrategy`)
- `AggregateDefinition`: Aggregate 정의 (`root`, `relations`, `entities`, `idStrategy?`)
- `EntityDefinition`: 하위 엔티티 (`table`, `relations`, `idStrategy?`)
- `RelationDefinition`: 관계 정의 (`type`: OneToOne/OneToMany/ManyToOne, `target`, `joinColumn`)
- `IdStrategy`: ID 생성 전략 enum — `IDENTITY`(기본), `SEQUENCE`, `UUID`, `AUTO`, `NONE`(`@GeneratedValue` 미생성)
  - 우선순위: entity → aggregate → global (하위가 상위를 override)
- `AggregateConfigParser`: Jackson으로 설정 JSON 파싱

**Entity 코드 생성** (`spring.kraft.ddl.generator`):
- `NameConverter`: snake_case → PascalCase/camelCase 변환 + 단수화
- `ColumnTypeMapper`: SQL 타입 → Kotlin 타입 매핑 + import 수집
- `ColumnClassifier`: 컬럼 역할 분류 (PK/SKIP/JOIN_COLUMN/NORMAL) + `@IdentityColumn` 판정
- `EntityFileWriter`: `EntityMetadata` → Kotlin 소스 문자열 생성
- `EntityGenerator`: 오케스트레이터 — `TableSchema` + `AggregateConfig` → 파일 출력
  - root 테이블 → `AggregateRootBaseEntity`, 나머지 → `BaseEntity`
  - 관계 생성: 양방향이면 `mappedBy`, 단방향이면 `@JoinColumn` 사용
  - 설정 검증: root/entity/target 테이블 존재, joinColumn 위치 검증

### 코딩 스타일 결정

- **의존성 주입 시 상위 타입 사용**: 특별한 이유가 없는 한 구체 타입이 아닌 상위 클래스(인터페이스/추상클래스) 타입으로 주입. 예) `TestBaseEntityRepository` 대신 `JpaRepository<TestBaseEntity, Long>`
- **생성자 주입 우선**: 필드 주입(`@Autowired lateinit var`) 대신 생성자 주입(`val`)을 기본으로 사용. 불변성 보장 + null 안전성 확보
- audit 필드에 `protected set` 사용하지 않음 — `Traceable` 인터페이스에서 `val`로 선언하여 외부 setter가 이미 노출되지 않으므로 불필요
- **type erasure 대응**: 제네릭 인터페이스에서 런타임 타입 검사가 필요한 경우 `Class<T>` 프로퍼티를 인터페이스에 선언하여 `isInstance()` 검사 사용. `is T`나 `as? T`는 erasure로 상위 바운드까지만 검사되므로 신뢰 불가 (예: `AggregateRootAwareService.entityType`)
- `Result<T>` 사용 기준:
  - **일반 원칙**: 실패가 비즈니스 흐름의 일부인 경우만 사용 (예: `EntityHelper.compareTo()`). 인프라 레벨 예외(DB 오류, 설정 오류 등)는 그대로 throw — Spring `@ExceptionHandler`로 처리
  - **Result 파이프라인 내부** (예: `FormResolver`): `runCatching`/`flatMap`/`zip`으로 구성된 파이프라인 안에서는 인프라 예외도 `Result.failure`로 통합됨. 인프라 예외 전파 책임은 파이프라인 밖(Service/Controller)에서 `getOrThrow()` 등으로 처리
