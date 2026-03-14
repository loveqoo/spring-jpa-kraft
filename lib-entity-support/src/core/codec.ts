import * as E from "effect/Either";
import * as O from "effect/Option";
import {pipe} from "effect/Function";

export type Encoder<From, To, Err = string> = {
    encode: (from: From) => E.Either<To, Err>
}

export type Decoder<From, To, Err = string> = {
    decode: (to: To) => E.Either<From, Err>
}

export type Codec<From, To, Err = string> = Encoder<From, To, Err> & Decoder<From, To, Err>

export const compareEncodedValues = <From, To>(
    encoder: Encoder<From, To>,
    compare: (a: To, b: To) => boolean
) =>
    (a: From, b: From): E.Either<boolean, string> =>
        pipe(
            E.all([encoder.encode(a), encoder.encode(b)]),
            E.map(([encodedA, encodedB]: [To, To]): boolean => compare(encodedA, encodedB))
        )

function isPrimitive(value: unknown): boolean {
    if (value === null || value === undefined) return true
    const t = typeof value
    return t === 'string' || t === 'number' || t === 'boolean'
}

export const filterPrimitiveFields = <T extends Record<string, unknown>>(obj: T): Partial<T> =>
    Object.fromEntries(
        Object.entries(obj).filter(([, v]) => isPrimitive(v))
    ) as Partial<T>

export const encodeBy = <T>(
    value: T | null | undefined,
    encoder: Encoder<T, string>,
    onWrite: (encoded: string) => void
): void => {
    if (value !== null && value !== undefined) {
        pipe(
            encoder.encode(value),
            E.match({
                onLeft: (error) => {
                    console.error('Encoding error:', error)
                },
                onRight: (encoded) => onWrite(encoded)
            })
        )
    }
}

export const decodeBy = <T>(
    optionValue: O.Option<string>,
    decoder: Decoder<T, string>,
): T | null => pipe(
    optionValue,
    O.flatMap(value => pipe(
        decoder.decode(value),
        E.match({onLeft: () => O.none(), onRight: (value): O.Option<T> => O.some(value)})
    )),
    O.getOrElse((): null => null)
)

export const IdentityCodec = <A extends object>(
    filterPrimitive = false
): Codec<A, A> => ({
    encode: (from: A): E.Either<A, string> => {
        if (filterPrimitive) {
            const result = Object.fromEntries(
                Object.entries(from).filter(([, v]) => isPrimitive(v))
            ) as A
            return E.right(result)
        }
        return E.right(from)
    },
    decode: (to: A): E.Either<A, string> => {
        if (filterPrimitive) {
            const result = Object.fromEntries(
                Object.entries(to).filter(([, v]) => isPrimitive(v))
            ) as A
            return E.right(result)
        }
        return E.right(to)
    },
})
