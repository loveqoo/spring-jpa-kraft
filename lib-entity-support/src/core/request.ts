import {Option as O, Schema as S} from 'effect'
import {equalsIgnoreCase} from "./extensions.ts";
import {effectOps} from "./utils.ts";
import type {Codec} from "./codec.ts";

export enum SortType {
    ASC = 'asc', DESC = 'desc',
}

export const SortTypeSchema = S.Enums(SortType)

export type SortParam = {
    columnName: string
    sortType: O.Option<SortType>
    ignoreCase: boolean
}

export const SortParamSchema = S.Struct({
    columnName: S.String,
    sortType: S.OptionFromSelf(SortTypeSchema),
    ignoreCase: S.Boolean
})

const transformSchema = S.transform(S.String, SortParamSchema, {
    strict: true,
    encode: (sortParam): string => {
        const sortType = O.getOrElse(O.map(sortParam.sortType as O.Option<SortType>, sortType => `,${sortType}`), () => '')
        const ignoreCase = sortParam.ignoreCase ? ',ignoreCase' : '';
        return `${sortParam.columnName}${sortType}${ignoreCase}`
    },
    decode: (str: string): SortParam => {
        const [columnName, ...sortDescriptions] = str.split(',');
        if (sortDescriptions.length === 0) {
            return {
                columnName,
                sortType: O.none(),
                ignoreCase: false
            } as SortParam
        }
        switch (sortDescriptions.length) {
            case 1: {
                const a1 = sortDescriptions[0].toLowerCase()
                if (a1 === 'desc' || a1 === 'asc') {
                    return {
                        columnName,
                        sortType: O.some(a1 === 'desc' ? SortType.DESC : SortType.ASC),
                        ignoreCase: false
                    } as SortParam
                }
                return {
                    columnName,
                    sortType: O.none(),
                    ignoreCase: equalsIgnoreCase(sortDescriptions[0], 'ignoreCase')
                } as SortParam
            }
            case 2: {
                const [h, t] = sortDescriptions
                const h1 = h.toLowerCase()
                if (h1 === 'desc' || h1 === 'asc') {
                    return {
                        columnName,
                        sortType: O.some(h1 === 'desc' ? SortType.DESC : SortType.ASC),
                        ignoreCase: equalsIgnoreCase(t, 'ignoreCase')
                    } as SortParam
                }
                if (equalsIgnoreCase(h, 'ignoreCase')) {
                    const t1 = t.toLowerCase()
                    if (t1 === 'desc' || t1 === 'asc') {
                        return {
                            columnName,
                            sortType: O.some(t1 === 'desc' ? SortType.DESC : SortType.ASC),
                            ignoreCase: true
                        } as SortParam
                    } else {
                        return {
                            columnName,
                            sortType: O.none(),
                            ignoreCase: true
                        } as SortParam
                    }
                } else {
                    return {
                        columnName,
                        sortType: O.none(),
                        ignoreCase: false
                    } as SortParam
                }
            }
            default: {
                return {
                    columnName,
                    sortType: O.none(),
                    ignoreCase: false
                } as SortParam
            }
        }
    }
})

export const SortParamCodec: Codec<SortParam, string> = effectOps.codec.byTransform(transformSchema)