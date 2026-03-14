import {describe, it, expect, vi} from 'vitest'
import {Either as E, Option as O} from 'effect'
import {compareEncodedValues, IdentityCodec, encodeBy, decodeBy, filterPrimitiveFields, type Codec, type Encoder, type Decoder} from './codec.ts'

describe('IdentityCodec', () => {
    const codec = IdentityCodec<{ name: string; age: number }>()

    it('encode는 입력을 그대로 반환한다', () => {
        const input = {name: 'Alice', age: 30}
        const result = codec.encode(input)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toEqual(input)
    })

    it('decode는 입력을 그대로 반환한다', () => {
        const input = {name: 'Bob', age: 25}
        const result = codec.decode(input)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toEqual(input)
    })
})

describe('IdentityCodec (filterPrimitive)', () => {
    const codec = IdentityCodec<Record<string, unknown>>(true)

    it('encode 시 primitive가 아닌 필드를 제거한다', () => {
        const input = {name: 'Alice', age: 30, nested: {x: 1}, items: [1, 2]}
        const result = codec.encode(input)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toEqual({name: 'Alice', age: 30})
    })

    it('decode 시 primitive가 아닌 필드를 제거한다', () => {
        const input = {id: 1, flag: true, data: {y: 2}, label: 'test'}
        const result = codec.decode(input)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toEqual({id: 1, flag: true, label: 'test'})
    })

    it('null과 undefined는 primitive로 취급한다', () => {
        const input = {name: 'Alice', empty: null, missing: undefined}
        const result = codec.encode(input)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toEqual({name: 'Alice', empty: null, missing: undefined})
    })
})

describe('compareEncodedValues', () => {
    const numberToStringCodec: Codec<number, string> = {
        encode: (n) => E.right(String(n)),
        decode: (s) => E.right(Number(s)),
    }

    const compare = compareEncodedValues(numberToStringCodec, (a, b) => a === b)

    it('같은 값이면 true를 반환한다', () => {
        const result = compare(42, 42)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toBe(true)
    })

    it('다른 값이면 false를 반환한다', () => {
        const result = compare(42, 99)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toBe(false)
    })

    it('encode가 실패하면 Left를 반환한다', () => {
        const failingCodec: Codec<number, string> = {
            encode: () => E.left('encode error'),
            decode: (s) => E.right(Number(s)),
        }
        const failCompare = compareEncodedValues(failingCodec, (a, b) => a === b)
        const result = failCompare(1, 2)
        expect(E.isLeft(result)).toBe(true)
    })
})

describe('encodeBy', () => {
    const encoder: Encoder<number, string> = {
        encode: (n) => E.right(String(n))
    }

    it('값이 있으면 encode 후 onWrite를 호출한다', () => {
        const onWrite = vi.fn()
        encodeBy(42, encoder, onWrite)
        expect(onWrite).toHaveBeenCalledWith('42')
    })

    it('null이면 onWrite를 호출하지 않는다', () => {
        const onWrite = vi.fn()
        encodeBy(null, encoder, onWrite)
        expect(onWrite).not.toHaveBeenCalled()
    })

    it('undefined이면 onWrite를 호출하지 않는다', () => {
        const onWrite = vi.fn()
        encodeBy(undefined, encoder, onWrite)
        expect(onWrite).not.toHaveBeenCalled()
    })

    it('encode가 실패하면 onWrite를 호출하지 않는다', () => {
        const failEncoder: Encoder<number, string> = {
            encode: () => E.left('error')
        }
        const onWrite = vi.fn()
        encodeBy(42, failEncoder, onWrite)
        expect(onWrite).not.toHaveBeenCalled()
    })
})

describe('decodeBy', () => {
    const decoder: Decoder<number, string> = {
        decode: (s) => E.right(Number(s))
    }

    it('Some이면 decode하여 값을 반환한다', () => {
        const result = decodeBy(O.some('42'), decoder)
        expect(result).toBe(42)
    })

    it('None이면 null을 반환한다', () => {
        const result = decodeBy(O.none(), decoder)
        expect(result).toBeNull()
    })

    it('decode가 실패하면 null을 반환한다', () => {
        const failDecoder: Decoder<number, string> = {
            decode: () => E.left('error')
        }
        const result = decodeBy(O.some('abc'), failDecoder)
        expect(result).toBeNull()
    })
})

describe('filterPrimitiveFields', () => {
    it('primitive 필드만 남긴다', () => {
        const obj = {name: 'Alice', age: 30, nested: {x: 1}, items: [1, 2]}
        const result = filterPrimitiveFields(obj)
        expect(result).toEqual({name: 'Alice', age: 30})
    })

    it('null과 undefined는 유지한다', () => {
        const obj = {name: 'Alice', empty: null, missing: undefined}
        const result = filterPrimitiveFields(obj)
        expect(result).toEqual({name: 'Alice', empty: null, missing: undefined})
    })

    it('boolean도 유지한다', () => {
        const obj = {flag: true, count: 0, label: 'test'}
        const result = filterPrimitiveFields(obj)
        expect(result).toEqual({flag: true, count: 0, label: 'test'})
    })
})
