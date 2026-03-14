import {describe, it, expect, vi, beforeEach} from 'vitest'
import {Either as E} from 'effect'
import {
    RemoteClient,
    responseHandlers,
    defaultOneHandler,
    allPagesOf,
} from './remoteClient.ts'
import type {RoleDefinition} from './role.ts'
import {roleHandler} from './role.ts'
import {QueryParam} from './queryParam.ts'
import type {Page} from './response.ts'
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

const openRole: RoleDefinition = {
    expression: '/api/test/**',
    regex: () => /^\/api\/test(\/.*)?$/,
    method: 'GET',
    roles: [],
    requiredAuth: false
}

const mockAxiosResponse = <T>(data: T): AxiosResponse<T> => ({
    data,
    status: 200,
    statusText: 'OK',
    headers: {},
    config: {headers: {} as any},
})

beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(roleHandler, 'userInfo').mockReturnValue(
        E.right({userId: '1', userName: 'test', roles: ['ADMIN']})
    )
})

describe('RemoteClient', () => {
    const client = new RemoteClient('http://api.test')

    describe('search', () => {
        it('GET 요청을 실행하고 Either로 감싼다', async () => {
            mockRequest.mockResolvedValue(mockAxiosResponse({id: 1, name: 'Alice'}))

            const result = await client.search<{id: number; name: string}>(config => {
                config.method('GET').url('/api/test/1')
            }).execute(openRole)

            expect(E.isRight(result)).toBe(true)
            const response = E.getOrThrow(result)
            expect(response.data).toEqual({id: 1, name: 'Alice'})
        })

        it('axios 에러 시 resolve(Left)를 반환한다', async () => {
            const axiosError = {
                isAxiosError: true,
                message: 'Network Error',
                response: undefined,
                status: undefined,
                code: 'ERR_NETWORK',
            }
            mockRequest.mockRejectedValue(axiosError)

            const result = await client.search(config => {
                config.method('GET').url('/api/test/1')
            }).execute(openRole)

            expect(E.isLeft(result)).toBe(true)
        })
    })

    describe('submit', () => {
        it('POST 요청을 실행한다', async () => {
            mockRequest.mockResolvedValue(mockAxiosResponse({id: 1, name: 'test', action: 'created'}))
            vi.spyOn(client.queryClient, 'invalidateQueries').mockResolvedValue()

            const submitRole: RoleDefinition = {...openRole, method: 'POST'}
            const result = await client.submit<{id: number}>(
                config => config.name('test'),
                config => {
                    config.method('POST')
                    config.url('/api/test')
                }
            ).execute(submitRole)

            expect(E.isRight(result)).toBe(true)
        })
    })
})

describe('RemoteTask role check', () => {
    const client = new RemoteClient('http://api.test')

    it('execute()를 재호출해도 첫 번째 롤 체크 결과가 캐싱된다', async () => {
        const authRole: RoleDefinition = {
            expression: '/api/test/**',
            regex: () => /^\/api\/test(\/.*)?$/,
            method: 'GET',
            roles: ['ADMIN'],
            requiredAuth: true,
        }

        mockRequest.mockResolvedValue(mockAxiosResponse({id: 1}))

        // 첫 호출: ADMIN 역할 보유 → 통과
        vi.spyOn(roleHandler, 'userInfo').mockReturnValue(
            E.right({userId: '1', userName: 'test', roles: ['ADMIN']})
        )

        const task = client.search(config => {
            config.method('GET').url('/api/test/1')
        })

        const first = await task.execute(authRole)
        expect(E.isRight(first)).toBe(true)

        // 두 번째 호출: 역할을 제거해도 캐싱된 결과로 여전히 통과
        vi.spyOn(roleHandler, 'userInfo').mockReturnValue(
            E.right({userId: '2', userName: 'other', roles: []})
        )

        const second = await task.execute(authRole)
        expect(E.isRight(second)).toBe(true)
    })

    it('권한이 없으면 resolve(Left)를 반환한다', async () => {
        const authRole: RoleDefinition = {
            expression: '/api/test/**',
            regex: () => /^\/api\/test(\/.*)?$/,
            method: 'GET',
            roles: ['SUPER_ADMIN'],
            requiredAuth: true
        }

        vi.spyOn(roleHandler, 'userInfo').mockReturnValue(
            E.right({userId: '1', userName: 'test', roles: ['USER']})
        )

        const result = await client.search(config => {
            config.method('GET').url('/api/test/1')
        }).execute(authRole)

        expect(E.isLeft(result)).toBe(true)
    })
})

describe('responseHandlers', () => {
    it('identity는 응답 데이터를 그대로 반환한다', () => {
        const handler = responseHandlers.identity<string>()
        const response = mockAxiosResponse('hello')
        const result = handler(E.right(response))
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toBe('hello')
    })

    it('one은 변환 함수를 적용한다', () => {
        const handler = defaultOneHandler<{name: string}, string>(
            (res) => res.data.name.toUpperCase()
        )
        const response = mockAxiosResponse({name: 'alice'})
        const result = handler(E.right(response))
        expect(E.getOrThrow(result)).toBe('ALICE')
    })
})

describe('allPagesOf', () => {
    it('모든 페이지를 순회하며 결과를 모은다', async () => {
        const makePage = (content: number[], last: boolean, number: number): Page<number> => ({
            content,
            pageable: {sort: {unsorted: true, sorted: false, empty: true}, pageNumber: number, pageSize: 2, offset: 0, unpaged: false, paged: true},
            totalPages: 2,
            totalElements: 4,
            last,
            numberOfElements: content.length,
            first: number === 0,
            size: 2,
            number,
            sort: {unsorted: true, sorted: false, empty: true},
            empty: false
        })

        let callCount = 0
        const fetchPage = (_qp: QueryParam): Promise<E.Either<Page<number>, string>> => {
            callCount++
            if (callCount === 1) return Promise.resolve(E.right(makePage([1, 2], false, 0)))
            return Promise.resolve(E.right(makePage([3, 4], true, 1)))
        }

        const result = await allPagesOf(fetchPage, (n) => n * 10)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toEqual([10, 20, 30, 40])
    })

    it('에러 페이지는 Left를 반환한다', async () => {
        const fetchPage = (): Promise<E.Either<Page<number>, string>> =>
            Promise.resolve(E.left('페이지 조회 실패'))

        const result = await allPagesOf(fetchPage, (n) => n)
        expect(E.isLeft(result)).toBe(true)
    })
})
