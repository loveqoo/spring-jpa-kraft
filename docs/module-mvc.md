# module-mvc 설계

## FormResolver 계층 (`spring.kraft.form`)

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

## UpdateForm\<ID\> (`spring.kraft.form`)

- 수정 폼 인터페이스. `val id: ID`로 대상 엔티티 식별
- `Companion` 유틸리티: 값이 실제로 변경된 경우에만 setter 호출하여 불필요한 dirty detection 방지
  - `updateEntity()`: 엔티티 참조 변경 (ID 비교)
  - `updateProperty()`: 단순 값 비교 후 변경
  - `updateProperty(raw, supplier, setter)`: 변환 후 비교

## Service 계층 (`spring.kraft.service`)

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

## Event (`spring.kraft.service.event`)

- `AggregateRootVersionUpEvent<ID>`: Aggregate Root의 version이 증가할 때 발행되는 도메인 이벤트
  - `aggregateRootId: ID` — 대상 aggregate root의 식별자
  - `aggregateRootType: Class<*>` — 리스너가 특정 aggregate 타입만 필터 가능
  - `sourceEntityId: Any` — version 증가를 유발한 하위 엔티티의 식별자
  - `sourceEntityType: Class<*>` — 원인 엔티티 타입 (리스너에서 원인 추적 가능)
  - `addDomainEvent()`로 등록 → `save()` 시 Spring Data가 자동 발행 + clear
  - 이벤트 흐름: `BaseEntityService.afterSave`/`beforeDelete` → `AggregateRootAwareService.publishEvent()` → `versionUp()` + `addDomainEvent(AggregateRootVersionUpEvent)` → `save()` → Spring Data 이벤트 발행 → `@EventListener`/`@TransactionalEventListener`에서 처리

## Controller 계층 (`spring.kraft.controller`)

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
