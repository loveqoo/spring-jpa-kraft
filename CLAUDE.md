# CLAUDE.md

## 프로젝트 개요

- Spring JPA 기반 **라이브러리** 프로젝트 — Application main class 없음, bootJar 불필요

## 프로젝트 구조

- `module-core`: 공통 모듈 (현재 소스 없음)
- `module-jpa`: JPA 관련 기반 코드 (Entity, Repository, EntityHelper 등)
- `module-mvc`: Spring MVC 모듈 (bootJar main class 미설정 상태)
- `buildSrc`: Gradle 빌드 설정

## 빌드

- `./gradlew :module-jpa:build` — module-jpa 빌드 및 ktlint 검사
- ktlint가 check 태스크에 포함되어 있으므로 빌드 시 자동으로 코드 스타일 검사됨

## 아키텍처 결정 사항

### module-jpa 설계

**Entity 계층:**
- `BaseEntity<ID>`: 모든 엔티티의 기반. audit 컬럼, equals/hashCode 제공. ID 타입은 제네릭(`ID : Comparable<ID>`)
  - `@Id`, `@GeneratedValue` 없음 → 하위 클래스에서 PK 전략 결정
- `AggregateRootBaseEntity<A, ID>`: `AbstractAggregateRoot<A>` 상속. `Identifiable<ID>`, `Traceable`, `OptimisticLockSupport`, `SoftDeletable` 구현
  - `@Id`, `@GeneratedValue` 없음 → 하위 클래스에서 PK 전략 결정
  - `@Version`으로 낙관적 락 — JPA가 자동 관리
  - `versionUp()`: `updatedAt = LocalDateTime.now()`로 dirty 유발 → 하위 엔티티 변경 시 aggregate version 증가 트리거
  - `delete()`: soft delete (`deleted = true`)
  - 하위 엔티티 변경 시 version 증가는 Spring 이벤트 + AOP로 구현 예정

**type 패키지** (`spring.kraft.jpa.type`): 엔티티 관련 인터페이스 정의
- `Identifiable<ID>`: `id`, `isNew` (순수 식별) + `unproxy()` 확장 함수. `ID : Comparable<ID>` 제약으로 `Long`, `UUID`, `String`, `ULID` 등 수용
- `Traceable`: audit 컬럼(`createdAt`, `createdBy`, `updatedAt`, `updatedBy`) + 컬럼명 상수
- `Checkable`: 커스텀 체크 로직 (`check()`)
- `OptimisticLockSupport`: 낙관적 락 (`versionNumber: Long`, `versionUp()`) + 컬럼명 상수
- `SoftDeletable`: soft delete (`deleted: Boolean`, `delete()`) + 컬럼명 상수
- `ParentIdAware<ID>`: 부모 엔티티 ID 참조 (`parentId()`)
- 향후 추가 예정: 엔티티 복사, 특정 필드 기반 Ordering 등

**Repository:**
- Entity 기능 인터페이스에 대응하는 Repository도 함께 제공하여 기능을 확실히 지원
- `DynamicSearchRepository<ID, T>`: 모든 엔티티의 공통 검색 인터페이스. `Map<String, String>`으로 동적 where 조건 구성 (인접 테이블 조인 검색 포함)
- `SiblingsAwareRepository<E, P_ID>`: `ParentIdAware` 엔티티 대상, 같은 부모 ID를 가진 형제 엔티티 조회 (자기 자신 포함)
- `JPQLQuery<T>.fetchPage()`: QueryDSL 페이징 헬퍼 확장 함수. count 쿼리를 pagination 적용 전에 실행
- QueryDSL: KAPT 기반 (`querydsl-jpa`/`querydsl-apt` jakarta classifier)

**동등성(equals/hashCode) 전략:**
- 영속 상태 (`isNew == false`): `id` 기반 비교
- 비영속 상태 (`isNew == true`): `EntityHelper.transientEquals()`로 `@IdentityColumn` 마킹된 필드 기반 비교
- Hibernate 프록시 고려하여 `Hibernate.getClass()`로 타입 비교

**EntityHelper.compareTo():**
- `check(!e1.isNew && !e2.isNew)` — 둘 다 영속 상태일 때만 id 비교 허용

### 코딩 스타일 결정

- **의존성 주입 시 상위 타입 사용**: 특별한 이유가 없는 한 구체 타입이 아닌 상위 클래스(인터페이스/추상클래스) 타입으로 주입. 예) `TestBaseEntityRepository` 대신 `JpaRepository<TestBaseEntity, Long>`
- **생성자 주입 우선**: 필드 주입(`@Autowired lateinit var`) 대신 생성자 주입(`val`)을 기본으로 사용. 불변성 보장 + null 안전성 확보
- audit 필드에 `protected set` 사용하지 않음 — `Traceable` 인터페이스에서 `val`로 선언하여 외부 setter가 이미 노출되지 않으므로 불필요
- `Result<T>` 사용 기준: 실패가 비즈니스 흐름의 일부인 경우만 사용 (예: `EntityHelper.compareTo()`). 인프라 레벨 예외(DB 오류, 설정 오류 등)는 그대로 throw — Spring `@ExceptionHandler`로 처리
