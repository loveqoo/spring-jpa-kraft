import {describe, it, expect} from 'vitest'
import {toFormattedString, equalsIgnoreCase} from './extensions.ts'

describe('toFormattedString', () => {
    it('기본 포맷(YYYY-MM-DD HH:mm:ss)으로 변환한다', () => {
        const date = new Date(2024, 0, 15, 9, 30, 45) // 2024-01-15 09:30:45
        expect(toFormattedString(date)).toBe('2024-01-15 09:30:45')
    })

    it('커스텀 포맷을 지원한다', () => {
        const date = new Date(2024, 11, 25, 14, 0, 0) // 2024-12-25 14:00:00
        expect(toFormattedString(date, 'YYYY/MM/DD')).toBe('2024/12/25')
    })

    it('시간만 추출할 수 있다', () => {
        const date = new Date(2024, 5, 1, 8, 5, 3)
        expect(toFormattedString(date, 'HH:mm')).toBe('08:05')
    })
})

describe('equalsIgnoreCase', () => {
    it('같은 문자열이면 true', () => {
        expect(equalsIgnoreCase('hello', 'hello')).toBe(true)
    })

    it('대소문자만 다르면 true', () => {
        expect(equalsIgnoreCase('Hello', 'hELLO')).toBe(true)
    })

    it('다른 문자열이면 false', () => {
        expect(equalsIgnoreCase('hello', 'world')).toBe(false)
    })

    it('빈 문자열끼리는 true', () => {
        expect(equalsIgnoreCase('', '')).toBe(true)
    })
})
