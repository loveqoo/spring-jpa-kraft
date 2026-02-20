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
- `BaseEntity`: 모든 엔티티의 기반. `id`, audit 컬럼, equals/hashCode 제공
- `AggregateRootEntity`: `BaseEntity` 상속. Soft delete + `@Version` 낙관적 락 지원
  - version number는 하위 엔티티의 모든 변경사항을 반영하는 aggregate 버전
  - 하위 엔티티 변경 시 version 증가는 Spring 이벤트 + AOP로 구현 예정

**type 패키지** (`spring.kraft.jpa.type`): 엔티티 관련 인터페이스 정의
- `Identifiable`: `id`, `isNew` (순수 식별) + `unproxy()` 확장 함수
- `Traceable`: audit 컬럼(`createdAt`, `createdBy`, `updatedAt`, `updatedBy`) + 컬럼명 상수
- `Checkable`: 커스텀 체크 로직 (`check()`)
- `OptimisticLockSupport`: 낙관적 락 (`versionNumber`, `versionUp()`)
- 향후 추가 예정: 엔티티 복사, 특정 필드 기반 Ordering 등

**Repository:**
- Entity 기능 인터페이스에 대응하는 Repository도 함께 제공하여 기능을 확실히 지원

**동등성(equals/hashCode) 전략:**
- 영속 상태 (`isNew == false`): `id` 기반 비교
- 비영속 상태 (`isNew == true`): `EntityHelper.transientEquals()`로 `@IdentityColumn` 마킹된 필드 기반 비교
- Hibernate 프록시 고려하여 `Hibernate.getClass()`로 타입 비교

**EntityHelper.compareTo():**
- `check(!e1.isNew && !e2.isNew)` — 둘 다 영속 상태일 때만 id 비교 허용

### 코딩 스타일 결정

- audit 필드에 `protected set` 사용하지 않음 — `Traceable` 인터페이스에서 `val`로 선언하여 외부 setter가 이미 노출되지 않으므로 불필요
