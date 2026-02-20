# CLAUDE.md

## 프로젝트 구조

- `module-core`: 공통 모듈 (현재 소스 없음)
- `module-jpa`: JPA 관련 기반 코드 (BaseEntity, EntityHelper 등)
- `module-mvc`: Spring MVC 모듈 (bootJar main class 미설정 상태)
- `buildSrc`: Gradle 빌드 설정

## 빌드

- `./gradlew :module-jpa:build` — module-jpa 빌드 및 ktlint 검사
- ktlint가 check 태스크에 포함되어 있으므로 빌드 시 자동으로 코드 스타일 검사됨

## 아키텍처 결정 사항

### BaseEntity 설계 (`module-jpa`)

- 모든 JPA 엔티티는 `BaseEntity`를 상속한다.
- `Identifiable` 인터페이스: `id`, `isNew`, audit 컬럼(`createdAt`, `createdBy`, `updatedAt`, `updatedBy`) 정의
- `BaseEntity`: `@MappedSuperclass`로 공통 필드와 equals/hashCode 구현 제공

**동등성(equals/hashCode) 전략:**
- 영속 상태 (`isNew == false`): `id` 기반 비교
- 비영속 상태 (`isNew == true`): `EntityHelper.transientEquals()`로 `@IdentityColumn` 마킹된 필드 기반 비교
- Hibernate 프록시 고려하여 `Hibernate.getClass()`로 타입 비교

**EntityHelper.compareTo():**
- `check(!e1.isNew && !e2.isNew)` — 둘 다 영속 상태일 때만 id 비교 허용

### 코딩 스타일 결정

- audit 필드에 `protected set` 사용하지 않음 — `Identifiable` 인터페이스에서 `val`로 선언하여 외부 setter가 이미 노출되지 않으므로 불필요
