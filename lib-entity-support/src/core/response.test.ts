import {describe, it, expect} from 'vitest'
import {isPage, transformPage, isServerEntityApiErrorResponse, type Page} from './response.ts'

const makePage = <T>(content: T[], overrides: Partial<Page<T>> = {}): Page<T> => ({
    content,
    pageable: {
        sort: {unsorted: true, sorted: false, empty: true},
        pageNumber: 0, pageSize: 10, offset: 0, unpaged: false, paged: true
    },
    totalPages: 1,
    totalElements: content.length,
    last: true,
    numberOfElements: content.length,
    first: true,
    size: 10,
    number: 0,
    sort: {unsorted: true, sorted: false, empty: true},
    empty: content.length === 0,
    ...overrides
})

describe('isPage', () => {
    it('유효한 Page 객체이면 true', () => {
        expect(isPage(makePage([1, 2, 3]))).toBe(true)
    })

    it('빈 Page도 true', () => {
        expect(isPage(makePage([]))).toBe(true)
    })

    it('content가 없으면 false', () => {
        const invalid = {...makePage([1]), content: undefined}
        expect(isPage(invalid)).toBe(false)
    })

    it('totalPages가 숫자가 아니면 false', () => {
        const invalid = {...makePage([1]), totalPages: 'many'}
        expect(isPage(invalid)).toBe(false)
    })

    it('null이면 false', () => {
        expect(isPage(null)).toBe(false)
    })

    it('undefined이면 false', () => {
        expect(isPage(undefined)).toBe(false)
    })

    it('빈 객체이면 false', () => {
        expect(isPage({})).toBe(false)
    })
})

describe('transformPage', () => {
    it('content를 변환한다', () => {
        const page = makePage([1, 2, 3])
        const result = transformPage(page, n => n * 10)
        expect(result.content).toEqual([10, 20, 30])
    })

    it('메타데이터는 유지된다', () => {
        const page = makePage([1], {totalElements: 100, totalPages: 10, number: 5})
        const result = transformPage(page, n => String(n))
        expect(result.totalElements).toBe(100)
        expect(result.totalPages).toBe(10)
        expect(result.number).toBe(5)
    })

    it('빈 페이지도 처리한다', () => {
        const page = makePage<number>([])
        const result = transformPage(page, n => n * 2)
        expect(result.content).toEqual([])
    })
})

describe('isServerEntityApiErrorResponse', () => {
    it('status, error, message가 모두 있으면 true', () => {
        expect(isServerEntityApiErrorResponse({
            status: 400, error: 'Bad Request', message: '에러 발생', details: []
        })).toBe(true)
    })

    it('message만 있으면 false (status, error 필수)', () => {
        expect(isServerEntityApiErrorResponse({message: '에러 발생'})).toBe(false)
    })

    it('status가 숫자가 아니면 false', () => {
        expect(isServerEntityApiErrorResponse({
            status: '400', error: 'Bad Request', message: '에러'
        })).toBe(false)
    })

    it('null이면 false', () => {
        expect(isServerEntityApiErrorResponse(null)).toBe(false)
    })

    it('undefined이면 false', () => {
        expect(isServerEntityApiErrorResponse(undefined)).toBe(false)
    })
})
