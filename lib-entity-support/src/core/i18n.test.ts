import {describe, it, expect, beforeEach} from 'vitest'
import {t, setLocale, getLocale} from './i18n.ts'

beforeEach(() => {
    setLocale('ko')
})

describe('i18n', () => {
    it('기본 로케일은 ko이다', () => {
        expect(getLocale()).toBe('ko')
    })

    it('ko 메시지를 반환한다', () => {
        expect(t().revisionInsert).toBe('생성')
        expect(t().roleNoPermission).toBe('권한이 없습니다.')
        expect(t().unknownError).toBe('알 수 없음')
    })

    it('en으로 전환하면 영어 메시지를 반환한다', () => {
        setLocale('en')
        expect(getLocale()).toBe('en')
        expect(t().revisionInsert).toBe('Created')
        expect(t().roleNoPermission).toBe('Permission denied.')
        expect(t().unknownError).toBe('Unknown error')
    })

    it('함수형 메시지도 로케일에 따라 동작한다', () => {
        expect(t().entityDeleteNotSupported('User')).toContain('User')
        expect(t().entityDeleteNotSupported('User')).toContain('삭제')

        setLocale('en')
        expect(t().entityDeleteNotSupported('User')).toContain('User')
        expect(t().entityDeleteNotSupported('User')).toContain('Delete')
    })

    it('다시 ko로 전환할 수 있다', () => {
        setLocale('en')
        expect(t().revisionInsert).toBe('Created')

        setLocale('ko')
        expect(t().revisionInsert).toBe('생성')
    })
})
