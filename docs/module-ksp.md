# module-ksp 설계 (annotations + processor)

## module-ksp-annotations

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

## module-ksp-processor

### KSP 코드 생성 흐름

1. `@KraftAggregate` 어노테이션이 붙은 서비스 클래스 스캔
2. `findSupertypeArgs()`로 supertype 체인 순회하여 `BaseEntityService` 또는 `ReadOnlyEntityService` 탐지 + 타입 파라미터 추출
   - 중간 추상 클래스가 끼어도 제네릭 타입 치환을 정확히 수행 (`buildTypeParamMapping` + `substituteType`)
   - 예: `ConcreteService : AbstractService<Long, Order>` → `AbstractService<ID, E> : BaseEntityService<ID, E, CF, UF>` — ID→Long, E→Order 치환
3. `exclude`, `mediatorPackage` 파라미터 추출 + `@KraftExpose` 메서드 스캔 (`suspend` 함수 포함)
4. `root` 기준으로 그룹화
5. `mediatorPackage` 충돌 감지 — 같은 root 그룹 내 서로 다른 값이면 `logger.error()` + 해당 그룹 Mediator 미생성
6. 그룹별 타입 안전 ID value class + InternalMediator 코드 생성 (공통 메서드 제외 + 커스텀 메서드 포함)

### 패키지 배치 규칙

- root 엔티티 패키지에서 마지막 세그먼트를 제거하여 기반 패키지 결정 (예: `com.example.order.entity.OrderRoot` → `com.example.order`)
- ID 클래스: `{기반패키지}.id` (예: `com.example.order.id.OrderRootId`)
- Mediator: `{기반패키지}.mediator` (예: `com.example.order.mediator.OrderRootInternalMediator`)

### TypedIdGenerator

엔티티별 타입 안전 ID 생성:
- `@JvmInline value class {EntityName}Id(val value: {PrimitiveId})` + `Comparable` 구현
- 확장 함수 `{PrimitiveId}.to{EntityName}Id()` 포함
- 잘못된 ID 타입 전달을 컴파일 타임에 차단
- 중복 생성 방지 키에 `idType` FQN 포함 — 같은 entityName + 다른 ID 타입도 정확히 구분

### InternalMediatorGenerator

인터페이스/구현 분리 Mediator 코드 생성:
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

### 데이터 클래스

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

### 테스트

`kotlin-compile-testing-ksp` (kctfork) 라이브러리로 KSP 컴파일 테스트
- 테스트용 서비스 인터페이스 스텁 포함, 생성된 파일 존재 + 내용 검증
