import {describe, it, expect, beforeEach} from 'vitest'
import {Option as O} from 'effect'
import {IdSchema, AuditSearchSchema, createAuditSearchSchema, applyAuditInQueryParam, retrieveAuditFromQueryParam} from './schema.ts'
import {QueryParam} from './queryParam.ts'
import {setLocale} from './i18n.ts'

beforeEach(() => {
    setLocale('ko')
})

describe('IdSchema', () => {
    it('유효한 id를 통과시킨다', () => {
        expect(IdSchema.parse({id: 1})).toEqual({id: 1})
    })

    it('0 이하의 id는 실패한다', () => {
        expect(() => IdSchema.parse({id: 0})).toThrow()
        expect(() => IdSchema.parse({id: -1})).toThrow()
    })

    it('숫자가 아닌 id는 실패한다', () => {
        expect(() => IdSchema.parse({id: 'abc'})).toThrow()
    })
})

describe('AuditSearchSchema', () => {
    it('모든 필드가 optional이다', () => {
        expect(AuditSearchSchema.parse({})).toBeDefined()
    })

    it('유효한 값을 통과시킨다', () => {
        const result = AuditSearchSchema.parse({
            createdBy: 'admin',
            updatedBy: 'editor',
        })
        expect(result.createdBy).toBe('admin')
        expect(result.updatedBy).toBe('editor')
    })

    it('createdBy가 3자 미만이면 실패한다', () => {
        expect(() => AuditSearchSchema.parse({createdBy: 'ab'})).toThrow()
    })

    it('updatedBy가 3자 미만이면 실패한다', () => {
        expect(() => AuditSearchSchema.parse({updatedBy: 'ab'})).toThrow()
    })

    it('createAuditSearchSchema로 로케일 변경 후 새 스키마를 생성하면 메시지가 변경된다', () => {
        const koSchema = createAuditSearchSchema()
        const koResult = koSchema.safeParse({createdBy: 'ab'})
        expect(koResult.success).toBe(false)
        if (!koResult.success) {
            expect(koResult.error.issues[0].message).toContain('3자리')
        }

        setLocale('en')
        const enSchema = createAuditSearchSchema()
        const enResult = enSchema.safeParse({createdBy: 'ab'})
        expect(enResult.success).toBe(false)
        if (!enResult.success) {
            expect(enResult.error.issues[0].message).toContain('3 characters')
        }
    })

    it('null/undefined는 통과한다', () => {
        expect(AuditSearchSchema.parse({createdBy: null})).toBeDefined()
        expect(AuditSearchSchema.parse({createdBy: undefined})).toBeDefined()
    })
})

describe('applyAuditInQueryParam', () => {
    it('audit 필드를 QueryParam에 적용한다', () => {
        const qp = QueryParam.of()
        const data = {
            createdBy: 'admin',
            createdAt: new Date(2024, 0, 15, 9, 0, 0),
            updatedBy: null,
            updatedAt: null,
        }
        const result = applyAuditInQueryParam(data, qp)
        expect(O.getOrThrow(result.readOne('createdBy'))).toBe('admin')
        expect(O.getOrThrow(result.readOne('createdAt'))).toContain('2024-01-15')
        expect(O.isNone(result.readOne('updatedBy'))).toBe(true)
    })

    it('모든 필드가 null이면 아무것도 추가하지 않는다', () => {
        const qp = QueryParam.of()
        const data = {createdBy: null, createdAt: null, updatedBy: null, updatedAt: null}
        applyAuditInQueryParam(data, qp)
        expect(qp.isEmpty()).toBe(true)
    })
})

describe('retrieveAuditFromQueryParam', () => {
    it('QueryParam에서 audit 필드를 추출한다', () => {
        const qp = QueryParam.of()
            .write('createdBy', 'admin')
            .write('createdAt', '2024-01-15 09:00:00')
        const result = retrieveAuditFromQueryParam(qp)
        expect(result.createdBy).toBe('admin')
        expect(result.createdAt).toBeInstanceOf(Date)
        expect(result.updatedBy).toBeNull()
        expect(result.updatedAt).toBeNull()
    })

    it('빈 QueryParam이면 모두 null을 반환한다', () => {
        const result = retrieveAuditFromQueryParam(QueryParam.of())
        expect(result.createdBy).toBeNull()
        expect(result.createdAt).toBeNull()
        expect(result.updatedBy).toBeNull()
        expect(result.updatedAt).toBeNull()
    })
})
