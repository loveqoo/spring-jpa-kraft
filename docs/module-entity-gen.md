# module-entity-gen 설계

## 목적

DDL 기반 코드 생성 파이프라인의 파싱 단계. MySQL DDL(`.sql`)을 ANTLR4로 직접 파싱해 내부 데이터 모델을 만들고, Aggregate 설정(JSON)과 결합해 Entity 코드를 생성

**입력:** SQL 파일 + Aggregate Config JSON

## 데이터 모델 (`spring.kraft.entity.gen`)

- `TableSchema`: 테이블 목록
- `TableDef`: 이름, 스키마, 컬럼 목록, 인덱스 목록
- `TableColumn`: 이름, 타입명(`typeName`), 타입값(`typeValue`), pk, notNull, unique, autoIncrement, defaultValue, note
- `TableIndex`: 이름, 컬럼 목록, unique, pk

## ANTLR 문법 (`src/main/antlr/`)

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

## 파서 (`DdlParser`, `CreateTableVisitor`)

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

## Aggregate 설정 (`spring.kraft.entity.gen.config`)

- `AggregateConfig`: 설정 최상위 (`basePackage`, `aggregates`, `idStrategy`)
- `AggregateDefinition`: Aggregate 정의 (`root`, `relations`, `entities`, `idStrategy?`)
- `EntityDefinition`: 하위 엔티티 (`table`, `relations`, `idStrategy?`)
- `RelationDefinition`: 관계 정의 (`type`: OneToOne/OneToMany/ManyToOne, `target`, `joinColumn`)
- `IdStrategy`: ID 생성 전략 enum — `IDENTITY`(기본), `SEQUENCE`, `UUID`, `AUTO`, `NONE`(`@GeneratedValue` 미생성)
  - 우선순위: entity → aggregate → global (하위가 상위를 override)
- `AggregateConfigParser`: Jackson으로 설정 JSON 파싱

## Entity 코드 생성 (`spring.kraft.entity.gen.generator`)

- `NameConverter`: snake_case → PascalCase/camelCase 변환 + 단수화
- `ColumnTypeMapper`: SQL 타입 → Kotlin 타입 매핑 + import 수집
- `ColumnClassifier`: 컬럼 역할 분류 (PK/SKIP/JOIN_COLUMN/NORMAL) + `@IdentityColumn` 판정
- `EntityFileWriter`: `EntityMetadata` → Kotlin 소스 문자열 생성
- `EntityGenerator`: 오케스트레이터 — `TableSchema` + `AggregateConfig` → 파일 출력
  - root 테이블 → `AggregateRootBaseEntity`, 나머지 → `BaseEntity`
  - 관계 생성: 양방향이면 `mappedBy`, 단방향이면 `@JoinColumn` 사용
  - 설정 검증: root/entity/target 테이블 존재, joinColumn 위치 검증
  - `buildMetadataList()`: 메타데이터만 생성하는 public 메서드 — `SkeletonGenerator` 등 외부에서 재사용

## 스켈레톤 코드 생성 (`SkeletonGenerator`)

DDL + Aggregate Config로부터 Entity뿐 아니라 전체 계층(Repository, Form, Dto, FormResolver, Service, Controller)을 일괄 생성하는 오케스트레이터.

### 생성 파일 (테이블당 8개)

| 패키지 | 파일 | 역할 |
|--------|------|------|
| `entity/` | `{Class}.kt` | JPA Entity (기존 EntityGenerator와 동일) |
| `repository/` | `{Class}Repository.kt` | JpaRepository + QuerydslPredicateExecutor + DynamicSearchRepository |
| `form/` | `{Class}CreateForm.kt` | 생성용 data class (NORMAL 컬럼 + 부모 ID) |
| `form/` | `{Class}UpdateForm.kt` | 수정용 data class (nullable 필드, `UpdateForm<ID>` 구현) |
| `dto/` | `{Class}Dto.kt` | 읽기용 data class (`Serializable` 구현) |
| `service/` | `{Class}FormResolver.kt` | FormResolver0~4 — forward relation 수에 따라 자동 선택 |
| `service/` | `{Class}Service.kt` | SearchableEntityService 구현 |
| `controller/` | `{Class}Controller.kt` | SearchableEntityController 확장 (toReadDto, toCreateDto 등) |

### FormResolver 번호 자동 결정

forward relation(ManyToOne + forward OneToOne) 개수에 따라:
- 0개 → `FormResolver0` (root 엔티티)
- 1개 → `FormResolver1` (부모 1개)
- 2개 → `FormResolver2`, 3개 → `FormResolver3`, 4개 → `FormResolver4`

### 개별 FileWriter

- `RepositoryFileWriter`: Repository interface 생성
- `FormFileWriter`: `writeCreateForm()` + `writeUpdateForm()` 두 메서드
- `DtoFileWriter`: PK + NORMAL 컬럼 기반 DTO
- `FormResolverFileWriter`: 부모 수에 따른 FormResolver 스켈레톤
- `ServiceFileWriter`: SearchableEntityService 구현 클래스
- `ControllerFileWriter`: SearchableEntityController + DTO 매핑 메서드

### 사용법

```kotlin
val generator = SkeletonGenerator()
generator.generate(schema, config, outputDir)
// outputDir 하위에 {basePackage}/entity/, repository/, form/, dto/, service/, controller/ 생성
```

## TableSchema JSON 직렬화 (`TableSchemaSerializer`)

DDL 파싱 결과(`TableSchema`)를 JSON으로 내보내거나, JSON에서 복원하는 유틸리티. SPA 등 외부 도구에서 스키마 정보를 활용해 `AggregateConfig` JSON을 생성하는 워크플로우를 지원.

```kotlin
val parser = DdlParser()
val serializer = TableSchemaSerializer()

// DDL → TableSchema → JSON 파일로 내보내기
val schema = parser.parse(File("schema.sql"))
val json = serializer.toJson(schema)
File("schema.json").writeText(json)

// JSON → TableSchema 복원
val restored = serializer.fromJson(File("schema.json").readText())
```

### 워크플로우 예시

1. DDL 파싱 → `schema.json` 내보내기
2. SPA에서 `schema.json` 읽어 시각적으로 Aggregate 구성 → `config.json` 생성
3. `config.json` + `schema.json`으로 스켈레톤 코드 생성:

```kotlin
val schema = TableSchemaSerializer().fromJson(File("schema.json").readText())
val config = AggregateConfigParser().parse(File("config.json").readText())
SkeletonGenerator().generate(schema, config, outputDir)
```
