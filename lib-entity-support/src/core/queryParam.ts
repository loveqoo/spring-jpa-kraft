import {Either as E, Function as F, Option as O, Schema as S} from 'effect'
import {type SortParam, SortParamCodec} from "./request.ts";
import dayjs from "dayjs";
import {debug, effectOps} from "./utils.ts";
import {type Codec, compareEncodedValues} from "./codec.ts";

export class QueryParam {
    constructor(readonly paramMap: Map<string, string[]>) {
    }

    isEmpty(): boolean {
        return this.paramMap.size === 0
    }

    read<T = string[]>(
        key: string,
        f: (values: string[]) => T = v => v as T
    ): O.Option<T> {
        return O.fromNullable(this.paramMap.get(key)).pipe(O.map(f))
    }

    readOne<T = string>(
        key: string,
        f: (values: string) => T = v => v as T
    ): O.Option<T> {
        return this.read(key)
            .pipe(O.flatMap(values => values.length === 0 ? O.none() : O.some(values[0])))
            .pipe(O.map(f))
    }

    readBoolean(key: string): O.Option<boolean> {
        return this.readOne(key, value => value === 'true')
    }

    readBooleanOr(key: string, defaultValue: boolean = true): boolean {
        return this.readOne(key, value => value === 'true')
            .pipe(O.getOrElse(() => defaultValue))
    }

    readNumber(key: string): O.Option<number> {
        return this.readOne(key, value => parseInt(value, 10))
            .pipe(O.flatMap(n => isNaN(n) ? O.none() : O.some(n)))
    }

    readNumberOr(key: string, defaultValue: number = 0): number {
        return this.readNumber(key)
            .pipe(O.getOrElse(() => defaultValue))
    }

    readString(key: string): O.Option<string> {
        return this.readOne(key)
    }

    readStringOr(key: string, defaultValue: string = ''): string {
        return this.readOne(key).pipe(O.getOrElse(() => defaultValue))
    }

    readDate(key: string): O.Option<Date> {
        return F.pipe(
            this.readOne(key),
            O.map(v => dayjs(v)),
            O.flatMap(d => d.isValid() ? O.some(d.toDate()) : O.none())
        )
    }

    readDateOr(key: string, defaultValue: Date = new Date()): Date {
        return this.readDate(key).pipe(O.getOrElse(() => defaultValue))
    }

    write(key: string, ...value: string[] | number[]): QueryParam {
        const values = value.map(v => v.toString()).filter(Boolean)
        values.length > 0 && this.paramMap.set(key, values)
        return this
    }

    writeIfNotSet(key: string, ...value: string[] | number[]): QueryParam {
        if (!this.paramMap.has(key)) {
            const values = value.map(v => v.toString()).filter(Boolean)
            values.length > 0 && this.paramMap.set(key, values)
        }
        return this
    }

    append(key: string, ...value: string[] | number[]): QueryParam {
        const values = value.map(v => v.toString()).filter(Boolean)
        if (values.length === 0) return this
        if (this.paramMap.has(key)) {
            this.paramMap.get(key)?.push(...values)
        } else {
            this.paramMap.set(key, values)
        }
        return this
    }

    remove(...keys: string[]): QueryParam {
        keys.forEach(k => this.paramMap.delete(k))
        return this
    }

    removeExcept(...keys: string[]): QueryParam {
        Array.from(this.paramMap.keys())
            .filter(k => !keys.includes(k))
            .forEach(k => this.paramMap.delete(k))
        return this
    }

    overwriteBy(queryParam: QueryParam, clear: boolean = true): QueryParam {
        clear && this.paramMap.clear()
        queryParam.paramMap.forEach((values, key) => {
            this.paramMap.set(key, [...values])
        })
        return this
    }

    syncTo(origin: URLSearchParams): URLSearchParams {
        Array.from(origin.keys()).forEach((key) => origin.delete(key))
        this.paramMap.forEach((values, key) => values.forEach(value => origin.append(key, value)))
        return origin
    }

    sortParams(): SortParam[] {
        return F.pipe(
            this.read('sort'),
            O.map(values => {
                const decodedValues = values.map(SortParamCodec.decode)
                const filteredValues = decodedValues.filter(E.isRight)
                if (decodedValues.length !== filteredValues.length) {
                    debug(`${decodedValues.length - filteredValues.length} SortParam value(s) excluded due to decoding failure`)
                }
                return filteredValues
            }),
            O.match({
                onSome: (sortParams) => sortParams.map(s => s.right),
                onNone: () => [] as SortParam[]
            })
        )
    }

    static of(origin?: QueryParam): QueryParam {
        return new QueryParam(origin ? structuredClone(origin.paramMap) : new Map<string, string[]>())
    }
}

const paramMapTransform = S.transform(
    S.String,
    S.MapFromSelf({key: S.String, value: S.mutable(S.Array(S.String))}), {
        strict: true,
        encode: (entries): string => {
            return Array.from(entries.entries())
                .map(([key, values]) => values.map(value =>
                    `${encodeURIComponent(key)}=${encodeURIComponent(value)}`).join('&')
                )
                .filter(Boolean)
                .join('&')
        },
        decode: (queryString: string): Map<string, string[]> => {
            const paramMap = new Map<string, string[]>()
            queryString.split('&').forEach(param => {
                const eqIndex = param.indexOf('=')
                if (eqIndex < 0) return
                const k = decodeURIComponent(param.slice(0, eqIndex))
                const v = decodeURIComponent(param.slice(eqIndex + 1))
                if (k) {
                    if (paramMap.has(k)) {
                        paramMap.get(k)?.push(v)
                    } else {
                        paramMap.set(k, [v])
                    }
                }
            })
            return paramMap
        }
    });

const ParamMapCodec: Codec<Map<string, string[]>, string> = effectOps.codec.byTransform(paramMapTransform)

export const QueryParamStringCodec: Codec<QueryParam, string> = {
    encode: (queryParam: QueryParam): E.Either<string, string> => ParamMapCodec.encode(queryParam.paramMap),
    decode: (queryString: string): E.Either<QueryParam, string> => F.pipe(
        ParamMapCodec.decode(queryString),
        E.map(paramMap => new QueryParam(paramMap))
    )
}

export const QueryParamUrlSearchParamsCodec: Codec<QueryParam, URLSearchParams> = {
    encode: (queryParam: QueryParam): E.Either<URLSearchParams, string> => F.pipe(
        QueryParamStringCodec.encode(queryParam),
        E.map(encoded => new URLSearchParams(encoded))
    ),
    decode: (urlSearchParams: URLSearchParams): E.Either<QueryParam, string> => F.pipe(
        QueryParamStringCodec.decode(urlSearchParams.toString()),
        E.map(paramMap => new QueryParam(paramMap.paramMap))
    )
}

export const equalsQueryParams = compareEncodedValues<QueryParam, string>(
    QueryParamStringCodec,
    (a, b) => debug(a === b, `QueryParam(${a}) === QueryParam(${b}) ->`)
)
