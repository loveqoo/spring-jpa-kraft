import {describe, it, expect} from 'vitest'
import {Either as E, Option as O} from 'effect'
import {SortType, SortParamCodec} from './request.ts'

describe('SortParamCodec', () => {
    describe('decode', () => {
        it('컬럼명만 있는 경우', () => {
            const result = SortParamCodec.decode('name')
            expect(E.isRight(result)).toBe(true)
            const param = E.getOrThrow(result)
            expect(param.columnName).toBe('name')
            expect(O.isNone(param.sortType)).toBe(true)
            expect(param.ignoreCase).toBe(false)
        })

        it('컬럼명 + 정렬방향 (desc)', () => {
            const result = SortParamCodec.decode('name,desc')
            expect(E.isRight(result)).toBe(true)
            const param = E.getOrThrow(result)
            expect(param.columnName).toBe('name')
            expect(O.getOrThrow(param.sortType)).toBe(SortType.DESC)
            expect(param.ignoreCase).toBe(false)
        })

        it('컬럼명 + 정렬방향 (asc)', () => {
            const result = SortParamCodec.decode('age,asc')
            expect(E.isRight(result)).toBe(true)
            const param = E.getOrThrow(result)
            expect(param.columnName).toBe('age')
            expect(O.getOrThrow(param.sortType)).toBe(SortType.ASC)
        })

        it('컬럼명 + ignoreCase', () => {
            const result = SortParamCodec.decode('name,ignoreCase')
            expect(E.isRight(result)).toBe(true)
            const param = E.getOrThrow(result)
            expect(param.columnName).toBe('name')
            expect(O.isNone(param.sortType)).toBe(true)
            expect(param.ignoreCase).toBe(true)
        })

        it('컬럼명 + 정렬방향 + ignoreCase', () => {
            const result = SortParamCodec.decode('name,desc,ignoreCase')
            expect(E.isRight(result)).toBe(true)
            const param = E.getOrThrow(result)
            expect(param.columnName).toBe('name')
            expect(O.getOrThrow(param.sortType)).toBe(SortType.DESC)
            expect(param.ignoreCase).toBe(true)
        })

        it('ignoreCase + 정렬방향 순서가 바뀌어도 동작한다', () => {
            const result = SortParamCodec.decode('name,ignoreCase,asc')
            expect(E.isRight(result)).toBe(true)
            const param = E.getOrThrow(result)
            expect(param.columnName).toBe('name')
            expect(O.getOrThrow(param.sortType)).toBe(SortType.ASC)
            expect(param.ignoreCase).toBe(true)
        })

        it('대소문자를 구분하지 않는다 (DESC, ASC)', () => {
            const result = SortParamCodec.decode('name,DESC')
            expect(E.isRight(result)).toBe(true)
            expect(O.getOrThrow(E.getOrThrow(result).sortType)).toBe(SortType.DESC)
        })
    })

    describe('encode', () => {
        it('컬럼명만 있는 경우', () => {
            const result = SortParamCodec.encode({
                columnName: 'name', sortType: O.none(), ignoreCase: false
            })
            expect(E.getOrThrow(result)).toBe('name')
        })

        it('컬럼명 + 정렬방향', () => {
            const result = SortParamCodec.encode({
                columnName: 'name', sortType: O.some(SortType.DESC), ignoreCase: false
            })
            expect(E.getOrThrow(result)).toBe('name,desc')
        })

        it('컬럼명 + ignoreCase', () => {
            const result = SortParamCodec.encode({
                columnName: 'name', sortType: O.none(), ignoreCase: true
            })
            expect(E.getOrThrow(result)).toBe('name,ignoreCase')
        })

        it('컬럼명 + 정렬방향 + ignoreCase', () => {
            const result = SortParamCodec.encode({
                columnName: 'name', sortType: O.some(SortType.ASC), ignoreCase: true
            })
            expect(E.getOrThrow(result)).toBe('name,asc,ignoreCase')
        })
    })

    describe('라운드트립', () => {
        it('decode → encode 라운드트립', () => {
            const original = 'createdAt,desc,ignoreCase'
            const decoded = E.getOrThrow(SortParamCodec.decode(original))
            const encoded = E.getOrThrow(SortParamCodec.encode(decoded))
            expect(encoded).toBe('createdAt,desc,ignoreCase')
        })
    })
})
