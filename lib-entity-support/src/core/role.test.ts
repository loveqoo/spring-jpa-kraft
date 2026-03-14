import {describe, it, expect, beforeEach} from 'vitest'
import {Either as E} from 'effect'
import {
    createRoleHandler, initRoleHandler, defaultHasRole, roleHandler,
    isRoleDefinition, isRoleError,
    type RoleDefinition, type RoleHandler
} from './role.ts'

beforeEach(() => {
    initRoleHandler({
        userInfo: () => E.right({userId: '', userName: '', roles: [] as string[]}),
        hasRole: defaultHasRole,
    })
})

const createRole = (overrides: Partial<RoleDefinition> = {}): RoleDefinition => ({
    expression: '/api/test/**',
    regex: () => /^\/api\/test(\/.*)?$/,
    method: 'GET',
    roles: ['ADMIN'],
    requiredAuth: true,
    ...overrides
})

describe('isRoleDefinition', () => {
    it('유효한 RoleDefinition이면 true', () => {
        expect(isRoleDefinition(createRole())).toBe(true)
    })

    it('필드가 누락되면 false', () => {
        expect(isRoleDefinition({expression: '/api'})).toBe(false)
    })

    it('null이면 false', () => {
        expect(isRoleDefinition(null)).toBe(false)
    })
})

describe('isRoleError', () => {
    it('유효한 RoleError이면 true', () => {
        expect(isRoleError({roleDef: createRole(), message: '에러'})).toBe(true)
    })

    it('roleDef가 없으면 false', () => {
        expect(isRoleError({message: '에러'})).toBe(false)
    })
})

describe('createRoleHandler', () => {
    it('커스텀 userInfo를 주입할 수 있다', () => {
        const handler = createRoleHandler({
            userInfo: () => E.right({userId: 'user-1', userName: 'Alice', roles: ['ADMIN']}),
            hasRole: defaultHasRole,
        })

        const result = handler.userInfo()
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result).userId).toBe('user-1')
        expect(E.getOrThrow(result).userName).toBe('Alice')
    })

    it('커스텀 hasRole 로직을 주입할 수 있다', () => {
        const handler = createRoleHandler({
            userInfo: () => E.right({userId: '1', userName: 'test', roles: ['USER']}),
            // 커스텀: USER는 ADMIN 역할도 포함하는 계층 구조
            hasRole: (userInfo, roleDef) => {
                const roleHierarchy: Record<string, string[]> = {USER: ['USER', 'ADMIN']}
                const expandedRoles = userInfo.roles.flatMap(r => roleHierarchy[r] ?? [r])
                const hasMatch = roleDef.roles.some(r => expandedRoles.includes(r))
                return hasMatch ? E.right(true) : E.left({roleDef, message: '권한 없음'})
            },
        })

        const role = createRole({roles: ['ADMIN'], requiredAuth: true})
        const result = handler.hasRole(role)
        expect(E.isRight(result)).toBe(true)
    })
})

describe('initRoleHandler', () => {
    it('전역 roleHandler를 교체한다', () => {
        initRoleHandler({
            userInfo: () => E.right({userId: 'injected', userName: 'Test', roles: ['ADMIN']}),
            hasRole: defaultHasRole,
        })

        const result = roleHandler.userInfo()
        expect(E.getOrThrow(result).userId).toBe('injected')
    })
})

describe('defaultHasRole', () => {
    it('requiredAuth가 false면 항상 통과한다', () => {
        const userInfo = {userId: '1', userName: 'test', roles: [] as string[]}
        const role = createRole({requiredAuth: false})
        const result = defaultHasRole(userInfo, role)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toBe(true)
    })

    it('역할이 일치하면 통과한다', () => {
        const userInfo = {userId: '1', userName: 'test', roles: ['ADMIN']}
        const role = createRole({requiredAuth: true, roles: ['ADMIN']})
        const result = defaultHasRole(userInfo, role)
        expect(E.isRight(result)).toBe(true)
    })

    it('역할이 없으면 실패한다', () => {
        const userInfo = {userId: '1', userName: 'test', roles: ['USER']}
        const role = createRole({requiredAuth: true, roles: ['ADMIN']})
        const result = defaultHasRole(userInfo, role)
        expect(E.isLeft(result)).toBe(true)
    })
})

describe('roleHandler.hasRole (기본 핸들러)', () => {
    it('requiredAuth가 false면 항상 통과한다', () => {
        const role = createRole({requiredAuth: false})
        const result = roleHandler.hasRole(role)
        expect(E.isRight(result)).toBe(true)
    })

    it('기본 핸들러는 빈 역할이므로 requiredAuth가 true면 실패한다', () => {
        const role = createRole({requiredAuth: true, roles: ['ADMIN']})
        const result = roleHandler.hasRole(role)
        expect(E.isLeft(result)).toBe(true)
    })
})

describe('roleHandler.hasRoleAfterValidation', () => {
    const userInfo = {userId: '1', userName: 'test', roles: ['ADMIN']}

    it('메소드, URL, 역할이 모두 일치하면 통과한다', () => {
        const role = createRole()
        const config = {method: 'GET', url: '/api/test/1'}
        const result = roleHandler.hasRoleAfterValidation(userInfo, config, role)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toBe(true)
    })

    it('메소드가 일치하지 않으면 실패한다', () => {
        const role = createRole({method: 'POST'})
        const config = {method: 'GET', url: '/api/test'}
        const result = roleHandler.hasRoleAfterValidation(userInfo, config, role)
        expect(E.isLeft(result)).toBe(true)
    })

    it('URL이 패턴에 일치하지 않으면 실패한다', () => {
        const role = createRole()
        const config = {method: 'GET', url: '/api/other'}
        const result = roleHandler.hasRoleAfterValidation(userInfo, config, role)
        expect(E.isLeft(result)).toBe(true)
    })

    it('역할이 부족하면 실패한다', () => {
        const noRoleUser = {userId: '1', userName: 'test', roles: ['USER']}
        const role = createRole({roles: ['ADMIN']})
        const config = {method: 'GET', url: '/api/test'}
        const result = roleHandler.hasRoleAfterValidation(noRoleUser, config, role)
        expect(E.isLeft(result)).toBe(true)
    })

    it('method가 없으면 실패한다', () => {
        const role = createRole()
        const config = {url: '/api/test'}
        const result = roleHandler.hasRoleAfterValidation(userInfo, config, role)
        expect(E.isLeft(result)).toBe(true)
    })

    it('url이 없으면 실패한다', () => {
        const role = createRole()
        const config = {method: 'GET'}
        const result = roleHandler.hasRoleAfterValidation(userInfo, config, role)
        expect(E.isLeft(result)).toBe(true)
    })

    it('requiredAuth가 false면 역할 없이도 통과한다', () => {
        const noRoleUser = {userId: '1', userName: 'test', roles: []}
        const role = createRole({requiredAuth: false})
        const config = {method: 'GET', url: '/api/test'}
        const result = roleHandler.hasRoleAfterValidation(noRoleUser, config, role)
        expect(E.isRight(result)).toBe(true)
    })

    it('URL에 쿼리스트링이 있어도 경로만으로 매칭한다', () => {
        const role = createRole()
        const config = {method: 'GET', url: '/api/test/1?page=1&size=10'}
        const result = roleHandler.hasRoleAfterValidation(userInfo, config, role)
        expect(E.isRight(result)).toBe(true)
    })

    it('지원하지 않는 메소드는 실패한다', () => {
        const role = createRole()
        const config = {method: 'PATCH', url: '/api/test'}
        const result = roleHandler.hasRoleAfterValidation(userInfo, config, role)
        expect(E.isLeft(result)).toBe(true)
    })
})
