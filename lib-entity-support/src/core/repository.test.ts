import {describe, it, expect, vi, beforeEach} from 'vitest'
import {Either as E} from 'effect'
import {Repository} from './repository.ts'
import {Entity, type IdentifiableDto, type ApiRoleDefinition, type UpdateForm} from './entity.ts'
import {RemoteClient, type AxiosRequestConfigExt} from './remoteClient.ts'
import {roleHandler} from './role.ts'
import type {RoleDefinition} from './role.ts'
import type {AxiosResponse} from 'axios'

vi.mock('axios', () => {
    const mockRequest = vi.fn()
    return {
        default: {request: mockRequest},
        isAxiosError: (e: any) => e?.isAxiosError === true,
    }
})

import axios from 'axios'

const mockRequest = vi.mocked(axios.request)

// --- Test fixtures ---

type TestDto = IdentifiableDto & {name: string}
type TestCreateForm = {name: string}
type TestUpdateForm = UpdateForm & {name: string}

class TestEntity extends Entity {
    readonly name: string

    constructor(dto: TestDto) {
        super(dto)
        this.name = dto.name
    }
}

const openRole: RoleDefinition = {
    expression: '/api/tests/**',
    regex: () => /^\/api\/tests(\/.*)?$/,
    method: 'GET',
    roles: [],
    requiredAuth: false,
}

const testApiRole: ApiRoleDefinition = {
    findById: openRole,
    page: openRole,
    create: {...openRole, method: 'POST'},
    update: {...openRole, method: 'PUT'},
    delete: {...openRole, method: 'DELETE'},
}

class TestRepository extends Repository<TestEntity, TestDto, TestCreateForm, TestUpdateForm> {
    entityName = 'Test'
    tableName = 'test'
    basePath = 'api/tests'
    role = testApiRole

    convert(dto: TestDto): TestEntity {
        return new TestEntity(dto)
    }
}

const mockAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {headers: {} as any},
})

const testDto: TestDto = {
    id: 1,
    name: 'Alice',
    createdAt: '2024-01-15T09:00:00',
    updatedAt: '2024-01-15T10:00:00',
    createdBy: 'admin',
    updatedBy: 'admin',
}

beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(roleHandler, 'userInfo').mockReturnValue(
        E.right({userId: '1', userName: 'test', roles: ['ADMIN']})
    )
})

describe('Repository', () => {
    const client = new RemoteClient('http://api.test')

    const repo = new TestRepository(client)

    describe('findById', () => {
        it('유효한 id로 엔티티를 조회한다', async () => {
            mockRequest.mockResolvedValue(mockAxiosResponse(testDto))

            const result = await repo.findById(1)
            expect(E.isRight(result)).toBe(true)
            const entity = E.getOrThrow(result)
            expect(entity.name).toBe('Alice')
            expect(entity.id).toBe(1)
        })

        it('undefined id는 Left를 반환한다', async () => {
            const result = await repo.findById(undefined)
            expect(E.isLeft(result)).toBe(true)
        })

        it('0 이하의 id는 Left를 반환한다', async () => {
            const result = await repo.findById(0)
            expect(E.isLeft(result)).toBe(true)
        })

        it('문자열 id를 파싱한다', async () => {
            mockRequest.mockResolvedValue(mockAxiosResponse(testDto))

            const result = await repo.findById('1')
            expect(E.isRight(result)).toBe(true)
        })
    })

    describe('create', () => {
        it('엔티티를 생성한다', async () => {
            mockRequest.mockResolvedValue(
                mockAxiosResponse({id: '1', name: 'test', action: 'create'})
            )
            vi.spyOn(client.queryClient, 'invalidateQueries').mockResolvedValue()

            const result = await repo.create(form => form.name('Alice'))
            expect(E.isRight(result)).toBe(true)
            const response = E.getOrThrow(result)
            expect(response.action).toBe('create')
        })
    })

    describe('delete', () => {
        it('role.delete가 없으면 Left를 반환한다', async () => {
            const noDeleteRole = {...testApiRole, delete: undefined as any}
            const noDeleteRepo = new (class extends TestRepository {
                role = noDeleteRole
            })(client)

            const result = await noDeleteRepo.delete(form => form.id(1).name('Alice'))
            expect(E.isLeft(result)).toBe(true)
        })
    })

    describe('list', () => {
        it('role.list가 없으면 Left를 반환한다', async () => {
            const result = await repo.list()
            // testApiRole에 list가 정의되지 않았으므로 Left
            expect(E.isLeft(result)).toBe(true)
        })

        it('role.list가 있으면 배열을 반환한다', async () => {
            mockRequest.mockResolvedValue(mockAxiosResponse([testDto]))

            const listRole: RoleDefinition = {...openRole}
            const repoWithList = new (class extends TestRepository {
                role = {...testApiRole, list: listRole}
            })(client)

            const result = await repoWithList.list()
            expect(E.isRight(result)).toBe(true)
            const entities = E.getOrThrow(result)
            expect(entities).toHaveLength(1)
            expect(entities[0].name).toBe('Alice')
        })
    })

    describe('revisionPage', () => {
        it('role.revision이 없으면 Left를 반환한다', async () => {
            const result = await repo.revisionPage(1, q => q.write('page', '1'))
            expect(E.isLeft(result)).toBe(true)
        })

        it('role.revision이 있으면 올바른 URL로 요청한다', async () => {
            const revisionRole: RoleDefinition = {...openRole}
            const repoWithRevision = new (class extends TestRepository {
                role = {...testApiRole, revision: revisionRole}
            })(client)

            const pageData = {
                content: [], pageable: {sort: {unsorted: true, sorted: false, empty: true}, pageNumber: 0, pageSize: 10, offset: 0, unpaged: false, paged: true},
                totalPages: 0, totalElements: 0, last: true, numberOfElements: 0, first: true, size: 10, number: 0,
                sort: {unsorted: true, sorted: false, empty: true}, empty: true
            }
            mockRequest.mockResolvedValue(mockAxiosResponse(pageData))

            await repoWithRevision.revisionPage(1, q => q.write('page', '1'))

            const calledUrl = mockRequest.mock.calls[0][0].url
            expect(calledUrl).toContain('/revisions/page')
            expect(calledUrl).not.toMatch(/\/revisions\?/)
        })
    })

    describe('revisions', () => {
        it('role.revision이 없으면 Left를 반환한다', async () => {
            const result = await repo.revisions(1)
            expect(E.isLeft(result)).toBe(true)
        })

        it('role.revision이 있으면 /revisions 경로로 요청한다', async () => {
            const revisionRole: RoleDefinition = {...openRole}
            const repoWithRevision = new (class extends TestRepository {
                role = {...testApiRole, revision: revisionRole}
            })(client)

            mockRequest.mockResolvedValue(mockAxiosResponse([]))

            await repoWithRevision.revisions(1)

            const calledUrl = mockRequest.mock.calls[0][0].url
            expect(calledUrl).toContain('/1/revisions')
            expect(calledUrl).not.toContain('/revisions/page')
        })
    })

    describe('swaggerUrl', () => {
        it('swagger URL을 생성한다', () => {
            const url = repo.swaggerUrl()
            expect(url).toContain('/swagger-ui/index.html')
            expect(url).toContain(encodeURIComponent('[TABLE] test'))
        })
    })

    describe('hasRole', () => {
        it('requiredAuth가 false면 true를 반환한다', () => {
            const result = repo.hasRole(openRole)
            expect(E.isRight(result)).toBe(true)
            expect(E.getOrThrow(result)).toBe(true)
        })
    })
})
