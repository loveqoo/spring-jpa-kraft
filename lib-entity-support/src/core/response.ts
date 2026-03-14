import {Schema as S} from 'effect'

export type Sort = {
    unsorted: boolean
    sorted: boolean
    empty: boolean
}

export const SortSchema = S.Struct({
    unsorted: S.Boolean,
    sorted: S.Boolean,
    empty: S.Boolean
})

export type Pageable = {
    sort: Sort,
    pageNumber: number,
    pageSize: number,
    offset: number,
    unpaged: boolean,
    paged: boolean
}

export type Page<T> = {
    content: Array<T>,
    pageable: Pageable,
    totalPages: number
    totalElements: number
    last: boolean
    numberOfElements: number
    first: boolean
    size: number
    number: number
    sort: Sort
    empty: boolean
}

export const isPage = <T = any>(obj: any): obj is Page<T> => {
    return !!obj
        && Array.isArray(obj.content)
        && typeof obj.pageable === 'object'
        && typeof obj.totalPages === 'number'
        && typeof obj.totalElements === 'number'
        && typeof obj.last === 'boolean'
        && typeof obj.numberOfElements === 'number'
        && typeof obj.first === 'boolean'
        && typeof obj.size === 'number'
        && typeof obj.number === 'number'
        && typeof obj.sort === 'object'
        && typeof obj.empty === 'boolean'
}

export const transformPage = <T, S>(
    page: Page<T>,
    f: (t: T) => S
): Page<S> => ({
    ...page,
    content: page.content.map(f),
} as Page<S>)

export type ServerEntityApiResponse = {
    id: string
    name: string
    action: 'create' | 'update' | 'delete'
}

export type FieldErrorDetail = {
    field: string
    message: string
    rejectedValue?: unknown
}

export type ServerEntityApiErrorResponse = {
    status: number
    error: string
    message: string
    details: FieldErrorDetail[]
}

export const isServerEntityApiErrorResponse = (res: any): res is ServerEntityApiErrorResponse => {
    return !!res
        && typeof res.status === 'number'
        && typeof res.error === 'string'
        && typeof res.message === 'string'
}