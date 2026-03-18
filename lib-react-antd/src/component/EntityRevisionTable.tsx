import {Tag} from "antd";
import type {ColumnsType} from "antd/es/table";
import {
    type IdentifiableDto,
    type Page,
    type RevisionDto,
    type QueryParam,
    RevisionType,
    type AxiosRequestConfigExt,
    type ObjectSetter,
} from "lib-entity-support";
import type {UseQueryOptions, UseQueryResult} from "@tanstack/react-query";
import {BasicTable} from "./BasicTable.tsx";
import {ta} from "../i18n.ts";

type EntityRevisionTableProps<D extends IdentifiableDto> = {
    entityId: number
    useQuery: (
        configParam: (q: QueryParam) => void,
        options?: Omit<UseQueryOptions<Page<RevisionDto<D>>, string, Page<RevisionDto<D>>, readonly unknown[]>, 'queryKey' | 'queryFn'>,
        configuration?: (os: ObjectSetter<AxiosRequestConfigExt>) => void
    ) => UseQueryResult<Page<RevisionDto<D>>, string>
    extraColumns?: ColumnsType<RevisionDto<D>>
    pageSize?: number
    embedded?: boolean
    title?: string
}

const revisionTypeColor = (type: string): string => {
    switch (type) {
        case 'INSERT': return 'green'
        case 'UPDATE': return 'blue'
        case 'DELETE': return 'red'
        default: return 'default'
    }
}

const revisionTypeLabel = (type: string): string => {
    if (type in RevisionType) {
        return RevisionType[type as keyof typeof RevisionType]
    }
    return type
}

const EntityRevisionTable = <D extends IdentifiableDto>(
    {
        entityId,
        useQuery,
        extraColumns,
        pageSize = 10,
        embedded = true,
        title,
    }: EntityRevisionTableProps<D>
) => {
    const baseColumns: ColumnsType<RevisionDto<D>> = [
        {
            title: ta().revisionNumber,
            dataIndex: ['metadata', 'revisionNumber'],
            key: 'revisionNumber',
            width: 100,
        },
        {
            title: ta().revisionType,
            dataIndex: ['metadata', 'revisionType'],
            key: 'revisionType',
            width: 120,
            render: (type: string) => (
                <Tag color={revisionTypeColor(type)}>
                    {revisionTypeLabel(type)}
                </Tag>
            ),
        },
        {
            title: ta().revisionInstant,
            dataIndex: 'revisionInstant',
            key: 'revisionInstant',
            width: 200,
        },
    ]

    const columns = [...baseColumns, ...(extraColumns ?? [])]

    return (
        <BasicTable<RevisionDto<D>>
            title={title ? () => title : undefined}
            useQuery={useQuery}
            columns={columns}
            colSort="revisionNumber,desc"
            pageSize={pageSize}
            embedded={embedded}
            rowKey={(record) => `${entityId}-${record.metadata.revisionNumber}`}
        />
    )
}

export default EntityRevisionTable
