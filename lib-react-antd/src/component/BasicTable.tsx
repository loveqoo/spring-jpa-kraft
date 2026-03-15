import * as React from "react";
import {
    EMPTY_FUNC,
    type ObjectSetter,
    type Page,
    QueryParam,
    QueryParamStringCodec,
    QueryParamUrlSearchParamsCodec
} from "lib-entity-support";
import {type AxiosRequestConfig} from "axios";
import {Table, type TablePaginationConfig, type TableProps} from "antd";
import type {UseQueryOptions, UseQueryResult} from "@tanstack/react-query";
import {SearchForm, type SearchProps} from "./SearchForm.tsx";
import {useEffect, useMemo, useState} from "react";
import {Either as E, Option as O, Function as F} from 'effect'
import {useLocation, useNavigate, useSearchParams} from 'react-router-dom'
import type {FilterValue, SorterResult, TableCurrentDataSource} from "antd/es/table/interface";
import type {DefaultOptionType} from 'antd/es/select'

export type BasicTableProps<T extends Record<string, any>, S extends Record<string, any>> = {
    children?: React.ReactNode
    useQuery: (
        configParam: (q: QueryParam) => void,
        options: Omit<UseQueryOptions<Page<T>, string, Page<T>, readonly unknown[]>, 'queryKey' | 'queryFn'>,
        configuration: (os: ObjectSetter<AxiosRequestConfig>) => void
    ) => UseQueryResult<Page<T>, string>
    useQueryOptions?: Omit<UseQueryOptions<Page<T>, string, Page<T>, readonly unknown[]>, 'queryKey' | 'queryFn'>
    pageNo?: number
    pageSize?: number
    colSort: string
    search?: SearchProps<S>
    embedded?: boolean
    idColumn?: string
    creationPath?: string
} & Omit<TableProps<T>, 'dataSource' | 'loading'>

const defaultPageNo = 1
export const defaultPageSize = 10

export const BasicTable = <T extends Record<string, any>, S extends Record<string, any> = object>(
    props: BasicTableProps<T, S>
) => {
    const embedded = props.embedded || false
    const [embeddedSearch, setEmbeddedSearch] = useState<string>('')
    const navigate = useNavigate()
    const location = useLocation()
    const [queryParam, setQueryParam] = useState<QueryParam>(buildQueryParam(location.search, embedded, embeddedSearch)
        .writeIfNotSet('page', props.pageNo || defaultPageNo)
        .writeIfNotSet('size', props.pageSize || defaultPageSize)
        .writeIfNotSet('sort', props.colSort || ''))
    const [searchParams, setSearchParams] = useSearchParams(QueryParamUrlSearchParamsCodec
        .encode(queryParam)
        .pipe(E.getOrElse(() => new URLSearchParams())))
    const [hiddenColumns, setHiddenColumns] = useState<string[]>([])

    const {data, isLoading, error} = props.useQuery(param => {
        param.overwriteBy(queryParam)
        F.pipe(
            O.zipWith(
                param.readString('searchKey'),
                param.readString('searchValue'),
                (searchKey, searchValue) => (
                    param.write(searchKey, searchValue)
                )
            ),
            O.getOrElse(() => param)
        ).remove('searchKey', 'searchValue')
    }, {retry: 0, staleTime: 0, ...props.useQueryOptions}, EMPTY_FUNC)

    useEffect(() => {
        if (embedded) {
            const newEmbeddedSearch = QueryParamStringCodec.encode(queryParam).pipe(E.getOrElse(() => ''))
            newEmbeddedSearch !== embeddedSearch && setEmbeddedSearch(newEmbeddedSearch)
        } else {
            const prev = searchParams.toString()
            const newSearchParam = queryParam.syncTo(searchParams)
            const next = newSearchParam.toString()
            prev !== next && setSearchParams(newSearchParam)
        }
    }, [queryParam, embedded, embeddedSearch, searchParams])

    useEffect(() => {
        setQueryParam(buildQueryParam(location.search, embedded, embeddedSearch)
            .writeIfNotSet('page', props.pageNo || defaultPageNo)
            .writeIfNotSet('size', props.pageSize || defaultPageSize)
            .writeIfNotSet('sort', props.colSort || ''))
    }, [location.search])

    useEffect(() => {
        if (error) {
            alert(error)
            setTimeout(() => navigate(-1), 2000)
        }
    }, [error]);

    const handlers = {
        onChange: (
            pagination: TablePaginationConfig,
            _: Record<string, FilterValue | null>,
            sorter: SorterResult<T> | SorterResult<T>[]
        ) => {
            !embedded && searchParams.delete('sort')
            queryParam.remove('sort')
            if (Array.isArray(sorter)) {
                const sorts = sorter.map((i) => {
                    const sortStr = encodeSorterResult(i)
                    !embedded && searchParams.append('sort', sortStr)
                    return sortStr
                })
                queryParam.write('sort', ...sorts)
            } else if (sorter.columnKey) {
                const sortStr = encodeSorterResult(sorter)
                !embedded && searchParams.append('sort', sortStr)
                queryParam.write('sort', sortStr)
            }
            if (!embedded) {
                searchParams.set('page', pagination.current!.toString())
                setSearchParams(searchParams)
            }
            setQueryParam(QueryParam.of(queryParam)
                .write('page', pagination.current!)
                .write('size', pagination.pageSize!))
        }
    }

    const columnOptions = useMemo(() => props.columns?.map(c =>
        ({label: c.title as string, value: c.key} as DefaultOptionType))
        .filter(c => c.value !== (props.idColumn || 'id')) || [], [props.columns, props.idColumn])

    const resolveRowId = (record: T): string => {
        if (typeof props.rowKey === 'function') {
            return String(props.rowKey(record))
        }
        const key = props.rowKey || props.idColumn || 'id'
        return String(record[key])
    }
    const onRow: TableProps['onRow'] = (record) => ({
        onClick: () => {
            navigate(resolveRowId(record))
        },
        style: {cursor: 'pointer'}
    })

    if (props.children) {
        return (<>
            {props.search
            ? <SearchForm
                    {...props.search}
                    emptyQueryParam={buildQueryParam(location.search, embedded, embeddedSearch)
                        .writeIfNotSet('page', props.pageNo || defaultPageNo)
                        .writeIfNotSet('size', props.pageSize || defaultPageSize)
                        .removeExcept('sort', 'page', 'size')}
                    queryParamState={[queryParam, setQueryParam]}
                    creationPath={props.creationPath}
                /> : void (0)
            }
            <Table<T>
                rowKey={props.rowKey || props.idColumn || 'id'}
                {...props}
                loading={isLoading}
                dataSource={data?.content || []}
                pagination={{
                    current: queryParam.readNumberOr('page', props.pageNo || defaultPageNo),
                    pageSize: queryParam.readNumberOr('size', props.pageSize || defaultPageSize),
                    total: data?.totalElements || 0,
                    showSizeChanger: true,
                    showTotal: (total) => `총 ${total.toLocaleString()}건`
                }}
                onChange={(pagination: TablePaginationConfig,
                           filters: Record<string, FilterValue | null>,
                           sorter: SorterResult<T> | SorterResult<T>[],
                           extra: TableCurrentDataSource<T>) => {
                    handlers.onChange(pagination, filters, sorter)
                    props.onChange && props.onChange(pagination, filters, sorter, extra)
                }}
                onRow={onRow}
            >{props.children}</Table>
        </>)
    } else {
        return (<>
            {props.search
                ? <SearchForm
                    {...props.search}
                    emptyQueryParam={buildQueryParam(location.search, embedded, embeddedSearch)
                        .writeIfNotSet('page', props.pageNo || defaultPageNo)
                        .writeIfNotSet('size', props.pageSize || defaultPageSize)
                        .removeExcept('sort', 'page', 'size')}
                    queryParamState={[queryParam, setQueryParam]}
                    columnOptions={columnOptions}
                    setHiddenColumnKeys={setHiddenColumns}
                    creationPath={props.creationPath}
                /> : void (0)
            }
            <Table<T>
                rowKey={props.rowKey || props.idColumn || 'id'}
                {...props}
                loading={isLoading}
                dataSource={data?.content || []}
                columns={props.columns?.filter(column => !hiddenColumns.includes(column.key as string))}
                pagination={{
                    current: queryParam.readNumberOr('page', props.pageNo || defaultPageNo),
                    pageSize: queryParam.readNumberOr('size', props.pageSize || defaultPageSize),
                    total: data?.totalElements || 0,
                    showSizeChanger: true,
                    showTotal: (total) => `총 ${total.toLocaleString()}건`
                }}
                onChange={(pagination: TablePaginationConfig,
                           filters: Record<string, FilterValue | null>,
                           sorter: SorterResult<T> | SorterResult<T>[],
                           extra: TableCurrentDataSource<T>) => {
                    handlers.onChange(pagination, filters, sorter)
                    props.onChange && props.onChange(pagination, filters, sorter, extra)
                }}
                onRow={onRow}
            />
        </>)
    }
}

const buildQueryParam = (
    search: string,
    embedded: boolean,
    embeddedSearch: string
): QueryParam => F.pipe(
    QueryParamStringCodec.decode(decodeURIComponent(embedded ? embeddedSearch : search.substring(1))),
    E.getOrElse(() => QueryParam.of())
)

const encodeSorterResult = <T extends object>(sorter: SorterResult<T>) => {
    let ignoreCase = false
    if (sorter.column && (sorter.column as any)['ignoreCase']) {
        ignoreCase = (sorter.column as any)['ignoreCase'] === true
    }
    const sortType = sorter.order === 'ascend' ? 'asc' : 'desc'
    return `${sorter.columnKey as string},${sortType}${ignoreCase ? ',ignoreCase':''}`
}