# CLAUDE.md

## 프로젝트 개요

- Spring JPA 기반 **라이브러리** 프로젝트 — Application main class 없음, bootJar 불필요

## 프로젝트 구조

| 모듈 | 설명 | 상세 |
|------|------|------|
| `module-jpa-mvc` | Core + JPA + MVC 통합 (Result 확장, Entity, Repository, Service, Controller) | [docs/module-jpa-mvc.md](docs/module-jpa-mvc.md) |
| `module-ksp-annotations` | KSP 어노테이션 (`@KraftAggregate`, `@KraftExpose`). 순수 Kotlin | [docs/module-ksp.md](docs/module-ksp.md) |
| `module-ksp-processor` | KSP 프로세서. 타입 안전 ID + InternalMediator 코드 생성 | [docs/module-ksp.md](docs/module-ksp.md) |
| `module-entity-gen` | ANTLR4 MySQL DDL 파서 + Entity 코드 생성 | [docs/module-entity-gen.md](docs/module-entity-gen.md) |
| `entity-designer` | Aggregate Designer SPA (React, npm workspace) | — |
| `buildSrc` | Gradle 빌드 설정 | — |

## 빌드

```bash
./gradlew :module-jpa-mvc:build
./gradlew :module-ksp-annotations:build
./gradlew :module-ksp-processor:build
./gradlew :module-entity-gen:build
```

- ktlint가 check 태스크에 포함 — 빌드 시 자동 코드 스타일 검사

## 코딩 스타일

- **의존성 주입 시 상위 타입 사용**: 구체 타입이 아닌 인터페이스/추상클래스 타입으로 주입
- **생성자 주입 우선**: 필드 주입(`@Autowired lateinit var`) 대신 생성자 주입(`val`). 불변성 + null 안전성
- audit 필드에 `protected set` 불필요 — `Traceable` 인터페이스에서 `val` 선언으로 이미 제한
- **type erasure 대응**: 런타임 타입 검사 필요 시 `Class<T>` 프로퍼티 + `isInstance()`. `is T`/`as? T` 신뢰 불가
- **`Result<T>` 사용 기준**:
  - 실패가 비즈니스 흐름의 일부인 경우만 사용. 인프라 예외는 throw → Spring `@ExceptionHandler`
  - Result 파이프라인 내부에서는 인프라 예외도 통합. 파이프라인 밖에서 `getOrThrow()`로 전파
