import {describe, it, expect} from 'vitest'
import {Either as E, Option as O} from 'effect'
import {idParameterResolver, idParameterResolverForPromise, effectOps, callOnce} from './utils.ts'

describe('idParameterResolver', () => {
    const resolve = idParameterResolver<string>(
        (err) => `ERROR: ${err}`,
        (id) => `OK: ${id}`
    )

    it('유효한 숫자를 처리한다', () => {
        expect(resolve(42)).toBe('OK: 42')
    })

    it('숫자 문자열을 파싱한다', () => {
        expect(resolve('123')).toBe('OK: 123')
    })

    it('undefined이면 에러를 반환한다', () => {
        expect(resolve(undefined)).toContain('ERROR:')
    })

    it('0 이하의 숫자는 에러를 반환한다', () => {
        expect(resolve(0)).toContain('ERROR:')
        expect(resolve(-1)).toContain('ERROR:')
    })

    it('숫자가 아닌 문자열은 에러를 반환한다', () => {
        expect(resolve('abc')).toContain('ERROR:')
    })

    it('빈 문자열은 에러를 반환한다', () => {
        expect(resolve('')).toContain('ERROR:')
    })
})

describe('idParameterResolverForPromise', () => {
    const resolve = idParameterResolverForPromise(
        (id) => Promise.resolve(E.right(`found: ${id}`))
    )

    it('유효한 id로 Right를 반환한다', async () => {
        const result = await resolve(1)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toBe('found: 1')
    })

    it('유효한 문자열 id로 Right를 반환한다', async () => {
        const result = await resolve('42')
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toBe('found: 42')
    })

    it('undefined이면 Left를 반환한다', async () => {
        const result = await resolve(undefined)
        expect(E.isLeft(result)).toBe(true)
    })
})

describe('effectOps', () => {
    describe('tryToOption', () => {
        it('성공하면 Some을 반환한다', () => {
            const result = effectOps.tryToOption(() => 42)
            expect(O.isSome(result)).toBe(true)
            expect(O.getOrThrow(result)).toBe(42)
        })

        it('예외가 발생하면 None을 반환한다', () => {
            const result = effectOps.tryToOption(() => {
                throw new Error('fail')
            })
            expect(O.isNone(result)).toBe(true)
        })
    })

    describe('tryToEither', () => {
        it('성공하면 Right를 반환한다', () => {
            const result = effectOps.tryToEither(() => 'hello')
            expect(E.isRight(result)).toBe(true)
            expect(E.getOrThrow(result)).toBe('hello')
        })

        it('예외가 발생하면 Left를 반환한다', () => {
            const result = effectOps.tryToEither(() => {
                throw new Error('fail')
            })
            expect(E.isLeft(result)).toBe(true)
        })
    })

    describe('fromNullable', () => {
        it('값이 있으면 Right를 반환한다', () => {
            const result = effectOps.fromNullable(() => 'null error')('hello')
            expect(E.isRight(result)).toBe(true)
            expect(E.getOrThrow(result)).toBe('hello')
        })

        it('null이면 Left를 반환한다', () => {
            const result = effectOps.fromNullable(() => 'null error')(null)
            expect(E.isLeft(result)).toBe(true)
        })

        it('undefined이면 Left를 반환한다', () => {
            const result = effectOps.fromNullable(() => 'null error')(undefined)
            expect(E.isLeft(result)).toBe(true)
        })
    })

    describe('cond', () => {
        it('조건이 true면 Right를 반환한다', () => {
            const result = effectOps.cond(true, () => 'yes', () => 'no')
            expect(E.isRight(result)).toBe(true)
            expect(E.getOrThrow(result)).toBe('yes')
        })

        it('조건이 false면 Left를 반환한다', () => {
            const result = effectOps.cond(false, () => 'yes', () => 'no')
            expect(E.isLeft(result)).toBe(true)
        })
    })
})

describe('callOnce', () => {
    it('함수를 한 번만 실행한다', () => {
        let count = 0
        const fn = callOnce(() => ++count)
        expect(fn()).toBe(1)
        expect(fn()).toBe(1)
        expect(fn()).toBe(1)
        expect(count).toBe(1)
    })

    it('인자가 달라도 첫 번째 결과를 반환한다', () => {
        const fn = callOnce((n: number) => n * 2)
        expect(fn(5)).toBe(10)
        expect(fn(100)).toBe(10)
    })
})
