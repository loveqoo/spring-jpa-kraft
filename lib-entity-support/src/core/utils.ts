import {Effect, Either as E, Function as F, Option as O, Schema as S} from 'effect'
import type {Codec} from './codec.ts'
import {t} from './i18n.ts'
import {z, ZodPipe, ZodString} from "zod";


export const debug = <T>(obj: T, msg?: string): T => {
    msg ? console.debug(msg, obj) : console.debug(obj)
    return obj
}

export const EMPTY_FUNC = () => {
}

export const idParameterResolver = <T>(
    onLeft: (errorMsg: string) => T,
    onRight: (id: number) => T,
    key: string = 'id',
    name?: string
) => (id: number | string | undefined): T => F.pipe(
    id,
    effectOps.fromNullable(() => t().idNotProvided(name ?? t().idDefaultName)),
    E.flatMap(_id => {
        if (typeof _id === 'string') {
            return /^\d+$/.test(_id)
                ? E.right(parseInt(_id, 10))
                : E.left(t().idInvalidFormat(key, _id, name ?? t().idDefaultName))
        } else {
            return E.right(_id)
        }
    }),
    E.flatMap(_id => !isNaN(_id) && _id > 0
        ? E.right(_id)
        : E.left(t().idInvalidValue(key, _id, name ?? t().idDefaultName))
    ),
    E.match({onLeft, onRight})
)

export const idParameterResolverForPromise = <T>(
    onSuccess: (id: number) => Promise<E.Either<T, string>>
) => (id: number | string | undefined): Promise<E.Either<T, string>> => idParameterResolver(
    errorMsg => Promise.resolve(E.left(errorMsg)),
    id => onSuccess(id)
)(id)

/**
 * 스키마 필수 여부를 확인하는 함수
 * @example
 * const required = requiredThunk(YourSchema.shape as Record<keyof YourSchema, z.ZodTypeAny>
 * const isRequired = required('fieldKey')
 */
export const requiredThunk = <S extends Record<string, any>>(
    shape: Record<keyof S, z.ZodTypeAny>
): (fieldKey: string) => boolean => fieldKey => {
    let _type: z.ZodTypeAny = shape[fieldKey]
    if(_type instanceof ZodPipe) { // support transform — unwrap to input type
        _type = _type.in as z.ZodTypeAny
    }
    // Input 엘리먼트의 경우 기본적으로 빈 문자열이므로, 최소 길이가 1 이상인지로 필수 여부를 판단.
    if(_type instanceof ZodString) {
        return (_type.minLength ?? 0) > 0
    }
    const t = _type.def.type
    return t !== 'optional' && t !== 'nullable' && t !== 'default'
}

export const effectOps = {
    tryToOption: <T>(f: () => T): O.Option<T> =>
        Effect.runSync(
            Effect.try({try: f, catch: (e: unknown): unknown => e}).pipe(
                Effect.match({
                    onSuccess: (v: T): O.Option<T> => O.some(v),
                    onFailure: (e: unknown): O.Option<never> => {
                        debug(e)
                        return O.none()
                    },
                })
            )
        ),

    tryToEither: <R, L = unknown>(f: () => R): E.Either<R, L> =>
        Effect.runSync(
            Effect.try({try: f, catch: (e: unknown): unknown => e}).pipe(
                Effect.match({
                    onSuccess: (v: R): E.Either<R, never> => E.right(v),
                    onFailure: (e: unknown): E.Either<never, L> => E.left(debug(e) as L),
                })
            )
        ),

    codec: {
        byTransform: <From, To>(schema: S.Schema<From, To>): Codec<From, To> => ({
            encode: (from: From): E.Either<To, string> =>
                effectOps.tryToEither<To, string>(() => S.encodeUnknownSync(schema)(from)),
            decode: (to: To): E.Either<From, string> =>
                effectOps.tryToEither<From, string>(() => S.decodeUnknownSync(schema)(to)),
        }),

        json: {
            with: <From>(schema: S.Schema<From>): Codec<From, string> => ({
                encode: (from: From): E.Either<string, string> =>
                    effectOps.tryToEither<string, string>(() => JSON.stringify(S.encodeUnknownSync(schema)(from))),
                decode: (json: string): E.Either<From, string> =>
                    effectOps.tryToEither<From, string>(() => S.decodeUnknownSync(schema)(JSON.parse(json))),
            }),
        },
    },
    fromNullable: <L>(onNull: () => L) => <A>(a: A | null | undefined): E.Either<A, L> => E.fromNullable(a, onNull),
    cond: <R, L>(test: boolean, right: () => R, left: () => L): E.Either<R, L> => test ? E.right(right()) : E.left(left())
}

export function callOnce<Args extends unknown[], R>(
    fn: (...args: Args) => R
): (...args: Args) => R {
    let called = false
    let result: R
    return (...args: Args): R => {
        if (!called) {
            result = fn(...args)
            called = true
        }
        return result
    }
}