import * as E from 'effect/Either'

export type ObjectSetter<T> = {
    [K in keyof T]-?: (arg: T[K]) => ObjectSetter<T>
}

export type ObjectBuilder<T> = {
    build: () => E.Either<T, never>
    on: (f: (setter: ObjectSetter<T>) => void) => ObjectBuilder<T>
}

export const builderOf = <T>(): ObjectBuilder<T> => {
    const source: Record<string, unknown> = {}
    const objectSetter = new Proxy({}, {
        get(_target, p) {
            return (x: unknown) => {
                source[p.toString()] = x
                return objectSetter
            }
        },
    }) as ObjectSetter<T>
    const body: ObjectBuilder<T> = {
        build: () => E.right(source as T),
        on: (f) => {
            f(objectSetter)
            return body
        },
    }
    return body
}
