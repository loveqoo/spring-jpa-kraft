import {describe, it, expect} from 'vitest'
import {Either as E, identity} from 'effect'
import {Entity, FetchableEntity, type IdentifiableDto} from './entity.ts'

const testDto: IdentifiableDto = {
    id: 1,
    createdAt: '2024-01-15T09:00:00',
    updatedAt: '2024-01-15T10:30:00',
    createdBy: 'admin',
    updatedBy: 'editor',
}

class SimpleEntity extends Entity {
    readonly name: string

    constructor(dto: IdentifiableDto & {name: string}) {
        super(dto)
        this.name = dto.name
    }
}

describe('Entity', () => {
    it('DTO에서 기본 필드를 변환한다', () => {
        const entity = new SimpleEntity({...testDto, name: 'Alice'})
        expect(entity.id).toBe(1)
        expect(entity.createdBy).toBe('admin')
        expect(entity.updatedBy).toBe('editor')
        expect(entity.name).toBe('Alice')
    })

    it('createdAt/updatedAt을 Date로 변환한다', () => {
        const entity = new SimpleEntity({...testDto, name: 'Alice'})
        expect(entity.createdAt).toBeInstanceOf(Date)
        expect(entity.updatedAt).toBeInstanceOf(Date)
        expect(entity.createdAt.getFullYear()).toBe(2024)
    })

    it('포맷팅된 날짜 문자열을 생성한다', () => {
        const entity = new SimpleEntity({...testDto, name: 'Alice'})
        expect(entity.createdAtStr).toMatch(/2024-01-15/)
        expect(entity.updatedAtStr).toMatch(/2024-01-15/)
    })
})

type FetchResult = {items: string[]}

class FetchableTestEntity extends FetchableEntity<FetchResult> {
    readonly name: string

    constructor(dto: IdentifiableDto & {name: string}) {
        super(dto)
        this.name = dto.name
    }

    fetch(_useCache?: boolean): Promise<E.Either<FetchResult, string>> {
        return Promise.resolve(E.right({items: ['a', 'b', 'c']}))
    }
}

class FailingFetchEntity extends FetchableEntity<FetchResult> {
    constructor(dto: IdentifiableDto) {
        super(dto)
    }

    fetch(_useCache?: boolean): Promise<E.Either<FetchResult, string>> {
        return Promise.resolve(E.left('fetch 실패'))
    }
}

describe('FetchableEntity', () => {
    it('fetch 결과를 Either로 반환한다', async () => {
        const entity = new FetchableTestEntity({...testDto, name: 'Alice'})
        const result = await entity.fetch()
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result).items).toEqual(['a', 'b', 'c'])
    })

    it('fetchWith는 transform을 적용한다', async () => {
        const entity = new FetchableTestEntity({...testDto, name: 'Alice'})
        const result = await entity.fetchWith(r => r.items.length)
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toBe(3)
    })

    it('fetchWith에 transform을 생략하면 identity를 적용한다', async () => {
        const entity = new FetchableTestEntity({...testDto, name: 'Alice'})
        const result = await entity.fetchWith()
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result).items).toEqual(['a', 'b', 'c'])
    })

    it('fetch가 실패하면 fetchWith도 Left를 반환한다', async () => {
        const entity = new FailingFetchEntity(testDto)
        const result = await entity.fetchWith()
        expect(E.isLeft(result)).toBe(true)
    })

    it('buildFetchWith는 외부 fetch 함수를 받아 동작한다', async () => {
        const entity = new FetchableTestEntity({...testDto, name: 'Alice'})
        const customFetch = () => Promise.resolve(E.right({items: ['x', 'y']}))
        const result = await entity.buildFetchWith(customFetch, r => r.items.join(','))
        expect(E.isRight(result)).toBe(true)
        expect(E.getOrThrow(result)).toBe('x,y')
    })
})
