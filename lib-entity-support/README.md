# lib-entity-support

Framework-agnostic TypeScript library for entity CRUD operations against Spring JPA backends.
No React dependency — provides the core building blocks that any frontend can consume.

## What It Does

```
Spring JPA Backend                    lib-entity-support                     Frontend App
┌──────────────────┐     HTTP      ┌─────────────────────────┐            ┌──────────────┐
│  Entity API      │◄────────────►│  RemoteClient (axios)    │            │  React, etc. │
│  /api/{entity}   │              │    └─ QueryClient cache  │            │              │
│                  │              │  Repository (CRUD)       │◄──────────│  consumes    │
│  Role-based      │              │  Role check (per request)│            │  Repository  │
│  Access Control  │              │  Entity / DTO mapping    │            │  & Entity    │
└──────────────────┘              │  Codec (type conversion) │            └──────────────┘
                                  │  QueryParam (pagination) │
                                  └─────────────────────────┘
```

## Setup

```typescript
import { RemoteClient, initRoleHandler, defaultHasRole, setLocale } from "lib-entity-support"

// 1. Locale (default: 'ko')
setLocale('en')

// 2. RemoteClient
const client = new RemoteClient("http://api.app")

// 3. Role handler — inject your auth logic
initRoleHandler({
  userInfo: () => fetchUserFromAuthServer(),  // () => Either<UserInfo, string>
  hasRole: defaultHasRole,                     // or your custom role logic
})
```

## Core Concepts

### Entity & DTO

`Entity` is the domain object on the frontend. `IdentifiableDto` is the raw shape from the server.
Each entity extends `Entity` (or `FetchableEntity` for related data) and maps DTO fields in its constructor.

```typescript
import { Entity, FetchableEntity, type IdentifiableDto } from "lib-entity-support"

type UserDto = { name: string; email: string } & IdentifiableDto

class UserEntity extends Entity {
  readonly name: string
  readonly email: string

  constructor(dto: UserDto) {
    super(dto)
    this.name = dto.name
    this.email = dto.email
  }
}
```

`FetchableEntity<T>` supports fetching related entities as a tuple:

```typescript
type UserFetchGroup = [UserEntity, DepartmentEntity]

class UserEntity extends FetchableEntity<UserFetchGroup> {
  async fetch(): Promise<E.Either<UserFetchGroup, string>> {
    const dept = await deptRepo.findById(this.deptId)
    if (E.isLeft(dept)) return E.left("Department not found")
    return E.right([this, dept.right])
  }
}
```

### Repository

Abstract CRUD repository. Subclass it per entity — provide `convert`, `role`, and path info.
All methods return `Promise<Either<T, string>>`. Consumers only handle Either, never `.catch`.

```typescript
import { Repository } from "lib-entity-support"

class UserRepository extends Repository<UserEntity, UserDto, CreateForm, UpdateForm> {
  entityName = "User"
  tableName = "USER"
  basePath = "api/users"
  role = new UserRoleDefinition()

  convert(dto: UserDto): UserEntity {
    return new UserEntity(dto)
  }
}

const userRepo = new UserRepository(client)

// CRUD — all results are Either<T, string>
const user    = await userRepo.findById(1)
const page    = await userRepo.page(q => q.write("size", "10"))
const created = await userRepo.create(f => f.name("Alice").email("alice@example.com"))
const updated = await userRepo.update(f => f.id(1).name("Bob"))
const deleted = await userRepo.delete(f => f.id(1))

// Revisions
const revisions   = await userRepo.revisions(1)                          // all revisions
const revPage     = await userRepo.revisionPage(1, q => q.write("page", "0"))  // paginated
```

### RemoteClient & Caching

Axios wrapper with optional `@tanstack/query-core` caching and role-based access control.
All infrastructure errors (network, timeout) are caught internally and returned as `Either.left(RemoteError)`.

```typescript
import { RemoteClient } from "lib-entity-support"

// Default QueryClient (5min stale, 1hr gc)
const client = new RemoteClient("http://api.app")

// Custom QueryClient
import { QueryClient } from "@tanstack/query-core"
const client = new RemoteClient("http://api.app", new QueryClient({ ... }))

// Search with client-side cache
const result = await client.search(config => {
  config.method("GET").url("/api/users/1").useClientCache(true)
}).execute(roleDefinition)
```

- `search()` — GET requests, optional cache via QueryClient
- `submit()` — POST/PUT/DELETE, auto-invalidates cache after mutation
- Every request goes through role checking before execution

### RemoteError

Discriminated union for all error types. Consumers can inspect `error.type` to determine the cause.

```typescript
import { type RemoteError } from "lib-entity-support"

// RemoteError =
//   | { type: 'axios';    error: AxiosError; message: string }  — HTTP/network error
//   | { type: 'role';     message: string }                     — permission denied
//   | { type: 'internal'; message: string }                     — unexpected error
```

### Builder (Zero-Boilerplate)

Proxy-based generic builder. Works with any TypeScript type — no per-type builder class needed.

```typescript
import { builderOf } from "lib-entity-support"

const result = builderOf<UserConfig>()
  .on(s => s.name("Alice").age(30).active(true))
  .build()
// result: Either<UserConfig, never>
```

### Codec

Bidirectional type conversion with `Either`-based error handling.

```typescript
import { type Codec, IdentityCodec, encodeBy, decodeBy, filterPrimitiveFields } from "lib-entity-support"

// Identity (no conversion)
const codec = IdentityCodec<UserForm>()

// With primitive filtering (strips nested objects)
const updateCodec = IdentityCodec<UserForm>(true)

// Null-safe encode/decode helpers
encodeBy(value, encoder, encoded => queryParam.write("key", encoded))
const decoded = decodeBy(queryParam.readString("key"), decoder) // T | null

// Extract only primitive fields from an object
const primitives = filterPrimitiveFields(data)
```

### QueryParam & Pagination

Spring-compatible query parameter management with typed readers and codec support.

```typescript
import { QueryParam, QueryParamStringCodec } from "lib-entity-support"

const qp = QueryParam.of()
  .write("page", "1")
  .write("size", "10")
  .append("sort", "name,desc")

qp.readNumberOr("page", 1)       // 1
qp.readStringOr("q", "")         // ""
qp.sortParams()                   // [{ columnName: "name", sortType: Some(DESC), ignoreCase: false }]

// Codec: QueryParam ↔ string (URL-encoded)
const encoded = QueryParamStringCodec.encode(qp)  // Either<string, string>
```

### Schema & Audit

Reusable zod schemas and audit field utilities for entity definitions.

```typescript
import { IdSchema, AuditSearchSchema, createAuditSearchSchema,
         applyAuditInQueryParam, retrieveAuditFromQueryParam } from "lib-entity-support"

// Entity schemas
const CreateSchema = z.object({ name: z.string(), email: z.string() })
const UpdateSchema = IdSchema.merge(CreateSchema)

// Audit fields in search
const SearchSchema = z.object({ name: z.string().optional() }).merge(AuditSearchSchema)

// After locale change, recreate schema for updated validation messages
setLocale('en')
const EnSearchSchema = z.object({ ... }).merge(createAuditSearchSchema())

// QueryParam ↔ Audit
applyAuditInQueryParam({ createdBy: "admin", createdAt: new Date(), updatedBy: null, updatedAt: null }, queryParam)
const audit = retrieveAuditFromQueryParam(queryParam)
```

### Role-Based Access Control

Roles are fully injectable. The library provides `defaultHasRole` (simple string matching) and `hasRoleAfterValidation` (method + URL + role check).

```typescript
import { initRoleHandler, defaultHasRole, createRoleHandler } from "lib-entity-support"

// Simple: use default role matching
initRoleHandler({
  userInfo: () => E.right({ userId: "1", userName: "admin", roles: ["ADMIN"] }),
  hasRole: defaultHasRole,
})

// Advanced: custom role hierarchy
initRoleHandler({
  userInfo: () => fetchUser(),
  hasRole: (userInfo, roleDef) => {
    const hierarchy = { USER: ["USER", "VIEWER"], ADMIN: ["ADMIN", "USER", "VIEWER"] }
    const expanded = userInfo.roles.flatMap(r => hierarchy[r] ?? [r])
    const hasMatch = roleDef.roles.some(r => expanded.includes(r))
    return hasMatch ? E.right(true) : E.left({ roleDef, message: "Permission denied" })
  },
})
```

Define roles per entity operation:

```typescript
import { type ApiRoleDefinition, type RoleDefinition } from "lib-entity-support"

class UserRoleDefinition implements ApiRoleDefinition {
  create: RoleDefinition  = roleStrategy["POST:/api/users"]
  findById: RoleDefinition = roleStrategy["GET:/api/users/{id}"]
  page: RoleDefinition     = roleStrategy["GET:/api/users"]
  update: RoleDefinition   = roleStrategy["PUT:/api/users/{id}"]
  delete: RoleDefinition   = roleStrategy["DELETE:/api/users/{id}"]
  list?: RoleDefinition    = roleStrategy["GET:/api/users"]
  revision?: RoleDefinition = roleStrategy["GET:/api/users/{id}/revisions"]
}
```

### i18n

Built-in Korean and English support. `setLocale` switches both library messages and zod validation messages.

```typescript
import { setLocale, getLocale } from "lib-entity-support"

setLocale('en')     // switch to English
getLocale()         // 'en'
setLocale('ko')     // switch back to Korean (default)
```

## Module Structure

```
src/core/
├── builder.ts        Proxy-based generic object builder
├── codec.ts          Encoder/Decoder/Codec types, IdentityCodec, encodeBy/decodeBy
├── entity.ts         Entity, FetchableEntity, IdentifiableDto, ApiRoleDefinition
├── extensions.ts     Date formatting (dayjs), string utilities
├── i18n.ts           Internationalization (ko/en), setLocale/getLocale
├── queryParam.ts     QueryParam, codecs (String, URLSearchParams)
├── remoteClient.ts   RemoteClient, RemoteTask, RemoteError, response handlers, caching
├── repository.ts     Abstract Repository (CRUD, pagination, revision)
├── request.ts        SortParam, SortType with codec
├── response.ts       Page, ServerEntityApiResponse, FieldErrorDetail, type guards
├── role.ts           RoleDefinition, RoleHandler, createRoleHandler, initRoleHandler
├── schema.ts         IdSchema, AuditSearchSchema, audit QueryParam helpers
└── utils.ts          effectOps, idParameterResolver, callOnce, debug
```

## Build & Test

```bash
npm run build        # tsc + vite build
npm run typecheck    # tsc --noEmit
npm run test         # vitest run
npm run test:watch   # vitest (watch mode)
```

## Tech Stack

| Dependency | Purpose |
|---|---|
| axios | HTTP client |
| @tanstack/query-core | Client-side query caching (no React dependency) |
| effect | Either, Option, Schema — functional error handling |
| zod | Schema validation with built-in i18n |
| dayjs | Date formatting |

## Breaking Changes (from initial codebase)

| Before | After | Reason |
|--------|-------|--------|
| `new RemoteClient(adminUrl, configUrl)` | `new RemoteClient(apiUrl, queryClient?)` | `adminUrl` removed, `configUrl` → `apiUrl`, `queryClient` injectable |
| `new Repository(remoteClient, backendUrl)` | `new Repository(remoteClient)` | `backendUrl` removed (uses `remoteClient.apiUrl`) |
| `queryClient` (module singleton) | `defaultQueryClient` + `remoteClient.queryClient` | QueryClient per-instance, injectable |
| `handlePromiseError()` | Removed | All errors handled inside `runRemote`, no `.catch` needed |
| `InternalError` type | `RemoteError` (discriminated union) | Clear error categorization: axios/role/internal |
| `roleHandler` (hardcoded) | `initRoleHandler(config)` | UserInfo and role checking injectable |
| `UserInfo.user_id: number` | `UserInfo.userId: string` | ID type-agnostic, camelCase naming |
| `ServerEntityApiErrorResponse.json` | `ServerEntityApiErrorResponse.details: FieldErrorDetail[]` | Structured field errors |
| `ServerEntityApiResponse.id: number` | `ServerEntityApiResponse.id: string` | Matches backend MutationResponse |
| `allPagesOf` returns `Promise<S[]>` | Returns `Promise<Either<S[], string>>` | No Promise.reject, consistent Either pattern |
| Hardcoded Korean messages | `setLocale('ko' \| 'en')` | i18n support |

## License

See root project license.
