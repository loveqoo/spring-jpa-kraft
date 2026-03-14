import {describe, it, expect} from 'vitest'
import {Either as E, Option as O} from 'effect'
import {QueryParam, QueryParamStringCodec, QueryParamUrlSearchParamsCodec, equalsQueryParams} from './queryParam.ts'

describe('QueryParam', () => {
    describe('기본 읽기/쓰기', () => {
        it('write로 값을 설정하고 read로 읽는다', () => {
            const qp = QueryParam.of().write('name', 'Alice')
            const result = qp.read('name')
            expect(O.isSome(result)).toBe(true)
            expect(O.getOrThrow(result)).toEqual(['Alice'])
        })

        it('readOne은 첫 번째 값만 반환한다', () => {
            const qp = QueryParam.of().write('name', 'Alice', 'Bob')
            const result = qp.readOne('name')
            expect(O.isSome(result)).toBe(true)
            expect(O.getOrThrow(result)).toBe('Alice')
        })

        it('존재하지 않는 키는 None을 반환한다', () => {
            const qp = QueryParam.of()
            expect(O.isNone(qp.read('missing'))).toBe(true)
            expect(O.isNone(qp.readOne('missing'))).toBe(true)
        })

        it('isEmpty는 비어있을 때 true', () => {
            expect(QueryParam.of().isEmpty()).toBe(true)
            expect(QueryParam.of().write('k', 'v').isEmpty()).toBe(false)
        })
    })

    describe('타입별 읽기', () => {
        it('readNumber는 숫자로 파싱한다', () => {
            const qp = QueryParam.of().write('page', '3')
            expect(O.getOrThrow(qp.readNumber('page'))).toBe(3)
        })

        it('readNumberOr는 없으면 기본값을 반환한다', () => {
            const qp = QueryParam.of()
            expect(qp.readNumberOr('page', 1)).toBe(1)
        })

        it('readNumberOr는 숫자가 아닌 값이면 기본값을 반환한다', () => {
            const qp = QueryParam.of().write('page', 'abc')
            expect(qp.readNumberOr('page', 1)).toBe(1)
        })

        it('readNumber는 숫자가 아닌 값이면 None을 반환한다', () => {
            const qp = QueryParam.of().write('page', 'abc')
            expect(O.isNone(qp.readNumber('page'))).toBe(true)
        })

        it('readBoolean은 "true"일 때만 true', () => {
            const qp = QueryParam.of().write('flag', 'true')
            expect(O.getOrThrow(qp.readBoolean('flag'))).toBe(true)
        })

        it('readBooleanOr는 "true"가 아닌 값이면 false', () => {
            const qp = QueryParam.of().write('flag', 'false')
            expect(qp.readBooleanOr('flag')).toBe(false)
        })

        it('readString은 문자열 값을 반환한다', () => {
            const qp = QueryParam.of().write('q', 'search term')
            expect(O.getOrThrow(qp.readString('q'))).toBe('search term')
        })

        it('readStringOr는 없으면 기본값을 반환한다', () => {
            const qp = QueryParam.of()
            expect(qp.readStringOr('q', 'default')).toBe('default')
        })

        it('readDate는 공백 구분자 날짜를 파싱한다', () => {
            const qp = QueryParam.of().write('date', '2024-01-15 09:30:00')
            const date = O.getOrThrow(qp.readDate('date'))
            expect(date.getFullYear()).toBe(2024)
            expect(date.getMonth()).toBe(0)
            expect(date.getDate()).toBe(15)
            expect(date.getHours()).toBe(9)
            expect(date.getMinutes()).toBe(30)
        })

        it('readDate는 ISO 8601(T 구분자) 날짜를 파싱한다', () => {
            const qp = QueryParam.of().write('date', '2024-01-15T09:30:00')
            const date = O.getOrThrow(qp.readDate('date'))
            expect(date.getFullYear()).toBe(2024)
            expect(date.getHours()).toBe(9)
            expect(date.getMinutes()).toBe(30)
        })

        it('readDate는 유효하지 않은 날짜 문자열이면 None을 반환한다', () => {
            const qp = QueryParam.of().write('date', 'invalid')
            expect(O.isNone(qp.readDate('date'))).toBe(true)
        })

        it('readDate는 빈 문자열이면 None을 반환한다', () => {
            const qp = QueryParam.of()
            qp.paramMap.set('date', [''])
            expect(O.isNone(qp.readDate('date'))).toBe(true)
        })

        it('readDateOr는 유효하지 않은 날짜면 기본값을 반환한다', () => {
            const qp = QueryParam.of().write('date', 'not-a-date')
            const fallback = new Date(2000, 0, 1)
            expect(qp.readDateOr('date', fallback)).toBe(fallback)
        })
    })

    describe('쓰기 동작', () => {
        it('write는 같은 키에 대해 덮어쓴다', () => {
            const qp = QueryParam.of().write('page', '1').write('page', '2')
            expect(O.getOrThrow(qp.readOne('page'))).toBe('2')
        })

        it('writeIfNotSet은 키가 없을 때만 설정한다', () => {
            const qp = QueryParam.of().write('page', '1').writeIfNotSet('page', '2')
            expect(O.getOrThrow(qp.readOne('page'))).toBe('1')
        })

        it('writeIfNotSet은 키가 없으면 설정한다', () => {
            const qp = QueryParam.of().writeIfNotSet('page', '1')
            expect(O.getOrThrow(qp.readOne('page'))).toBe('1')
        })

        it('append는 기존 값에 추가한다', () => {
            const qp = QueryParam.of().write('sort', 'name').append('sort', 'age')
            expect(O.getOrThrow(qp.read('sort'))).toEqual(['name', 'age'])
        })

        it('append는 키가 없으면 새로 만든다', () => {
            const qp = QueryParam.of().append('sort', 'name')
            expect(O.getOrThrow(qp.read('sort'))).toEqual(['name'])
        })

        it('빈 값은 write하지 않는다', () => {
            const qp = QueryParam.of().write('empty', '')
            expect(qp.isEmpty()).toBe(true)
        })
    })

    describe('삭제', () => {
        it('remove는 지정한 키를 삭제한다', () => {
            const qp = QueryParam.of().write('a', '1').write('b', '2').remove('a')
            expect(O.isNone(qp.read('a'))).toBe(true)
            expect(O.isSome(qp.read('b'))).toBe(true)
        })

        it('removeExcept은 지정한 키만 남긴다', () => {
            const qp = QueryParam.of().write('a', '1').write('b', '2').write('c', '3').removeExcept('b')
            expect(O.isNone(qp.read('a'))).toBe(true)
            expect(O.isSome(qp.read('b'))).toBe(true)
            expect(O.isNone(qp.read('c'))).toBe(true)
        })
    })

    describe('복사와 동기화', () => {
        it('of(origin)은 깊은 복사를 만든다', () => {
            const original = QueryParam.of().write('page', '1')
            const copy = QueryParam.of(original)
            copy.write('page', '2')
            expect(O.getOrThrow(original.readOne('page'))).toBe('1')
            expect(O.getOrThrow(copy.readOne('page'))).toBe('2')
        })

        it('overwriteBy는 다른 QueryParam의 값을 복사한다', () => {
            const qp1 = QueryParam.of().write('a', '1')
            const qp2 = QueryParam.of().write('b', '2')
            qp1.overwriteBy(qp2)
            expect(O.isNone(qp1.read('a'))).toBe(true)
            expect(O.getOrThrow(qp1.readOne('b'))).toBe('2')
        })

        it('overwriteBy(clear=false)는 기존 값을 유지하면서 병합한다', () => {
            const qp1 = QueryParam.of().write('a', '1')
            const qp2 = QueryParam.of().write('b', '2')
            qp1.overwriteBy(qp2, false)
            expect(O.getOrThrow(qp1.readOne('a'))).toBe('1')
            expect(O.getOrThrow(qp1.readOne('b'))).toBe('2')
        })

        it('syncTo는 URLSearchParams에 동기화한다', () => {
            const qp = QueryParam.of().write('page', '1').write('size', '10')
            const params = new URLSearchParams()
            qp.syncTo(params)
            expect(params.get('page')).toBe('1')
            expect(params.get('size')).toBe('10')
        })
    })
})

describe('QueryParamStringCodec', () => {
    it('encode/decode 라운드트립', () => {
        const qp = QueryParam.of().write('page', '1').write('size', '10')
        const encoded = QueryParamStringCodec.encode(qp)
        expect(E.isRight(encoded)).toBe(true)

        const decoded = QueryParamStringCodec.decode(E.getOrThrow(encoded))
        expect(E.isRight(decoded)).toBe(true)

        const result = E.getOrThrow(decoded)
        expect(O.getOrThrow(result.readOne('page'))).toBe('1')
        expect(O.getOrThrow(result.readOne('size'))).toBe('10')
    })

    it('빈 QueryParam은 빈 문자열로 인코딩된다', () => {
        const encoded = QueryParamStringCodec.encode(QueryParam.of())
        expect(E.isRight(encoded)).toBe(true)
        expect(E.getOrThrow(encoded)).toBe('')
    })

    it('특수문자(&, =, 공백)가 포함된 값을 안전하게 라운드트립한다', () => {
        const qp = QueryParam.of().write('q', 'hello world').write('filter', 'a=1&b=2')
        const encoded = QueryParamStringCodec.encode(qp)
        expect(E.isRight(encoded)).toBe(true)

        const decoded = QueryParamStringCodec.decode(E.getOrThrow(encoded))
        expect(E.isRight(decoded)).toBe(true)

        const result = E.getOrThrow(decoded)
        expect(O.getOrThrow(result.readOne('q'))).toBe('hello world')
        expect(O.getOrThrow(result.readOne('filter'))).toBe('a=1&b=2')
    })

    it('빈 문자열 값(?q=)도 보존한다', () => {
        const decoded = QueryParamStringCodec.decode('q=&page=1')
        expect(E.isRight(decoded)).toBe(true)
        const qp = E.getOrThrow(decoded)
        expect(O.getOrThrow(qp.readOne('q'))).toBe('')
        expect(O.getOrThrow(qp.readOne('page'))).toBe('1')
    })

    it('한글 값을 안전하게 라운드트립한다', () => {
        const qp = QueryParam.of().write('name', '홍길동')
        const encoded = QueryParamStringCodec.encode(qp)
        const decoded = QueryParamStringCodec.decode(E.getOrThrow(encoded))
        expect(O.getOrThrow(E.getOrThrow(decoded).readOne('name'))).toBe('홍길동')
    })
})

describe('QueryParamUrlSearchParamsCodec', () => {
    it('encode는 URLSearchParams를 반환한다', () => {
        const qp = QueryParam.of().write('q', 'test').write('page', '1')
        const encoded = QueryParamUrlSearchParamsCodec.encode(qp)
        expect(E.isRight(encoded)).toBe(true)
        const params = E.getOrThrow(encoded)
        expect(params.get('q')).toBe('test')
        expect(params.get('page')).toBe('1')
    })

    it('decode는 URLSearchParams에서 QueryParam을 복원한다', () => {
        const params = new URLSearchParams('q=test&page=1')
        const decoded = QueryParamUrlSearchParamsCodec.decode(params)
        expect(E.isRight(decoded)).toBe(true)
        const qp = E.getOrThrow(decoded)
        expect(O.getOrThrow(qp.readOne('q'))).toBe('test')
        expect(O.getOrThrow(qp.readOne('page'))).toBe('1')
    })
})

describe('equalsQueryParams', () => {
    it('같은 파라미터면 true', () => {
        const a = QueryParam.of().write('page', '1')
        const b = QueryParam.of().write('page', '1')
        const result = equalsQueryParams(a, b)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toBe(true)
    })

    it('다른 파라미터면 false', () => {
        const a = QueryParam.of().write('page', '1')
        const b = QueryParam.of().write('page', '2')
        const result = equalsQueryParams(a, b)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toBe(false)
    })
})
