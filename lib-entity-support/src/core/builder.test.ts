import {describe, it, expect} from 'vitest'
import {Either as E} from 'effect'
import {builderOf} from './builder.ts'

type TestConfig = {
    name: string
    age: number
    active: boolean
}

describe('builderOf', () => {
    it('설정한 값으로 객체를 빌드한다', () => {
        const result = builderOf<TestConfig>()
            .on(s => s.name('Alice').age(30).active(true))
            .build()

        expect(E.isRight(result)).toBe(true)
        const obj = E.getOrThrow(result)
        expect(obj.name).toBe('Alice')
        expect(obj.age).toBe(30)
        expect(obj.active).toBe(true)
    })

    it('on을 여러 번 호출하면 값이 누적된다', () => {
        const result = builderOf<TestConfig>()
            .on(s => s.name('Bob'))
            .on(s => s.age(25))
            .on(s => s.active(false))
            .build()

        expect(E.isRight(result)).toBe(true)
        const obj = E.getOrThrow(result)
        expect(obj.name).toBe('Bob')
        expect(obj.age).toBe(25)
        expect(obj.active).toBe(false)
    })

    it('같은 키를 다시 설정하면 마지막 값이 적용된다', () => {
        const result = builderOf<TestConfig>()
            .on(s => s.name('Alice'))
            .on(s => s.name('Charlie'))
            .build()

        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result).name).toBe('Charlie')
    })

    it('setter는 체이닝을 지원한다', () => {
        const result = builderOf<TestConfig>()
            .on(s => {
                s.name('Dave').age(40).active(true)
            })
            .build()

        expect(E.isRight(result)).toBe(true)
        const obj = E.getOrThrow(result)
        expect(obj.name).toBe('Dave')
        expect(obj.age).toBe(40)
    })

    it('아무 값도 설정하지 않으면 빈 객체를 반환한다', () => {
        const result = builderOf<TestConfig>().build()

        expect(E.isRight(result)).toBe(true)
        const obj = E.getOrThrow(result)
        expect(Object.keys(obj)).toHaveLength(0)
    })
})
