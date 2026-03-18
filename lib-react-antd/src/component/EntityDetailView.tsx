import React from "react";
import {Descriptions, type DescriptionsProps, Spin, Space, Button} from "antd";
import {type Entity} from "lib-entity-support";
import {ta} from "../i18n.ts";

type EntityDetailViewProps<T extends Entity> = {
    data: T | undefined
    isLoading: boolean
    children: (entity: T) => DescriptionsProps['items']
    title?: string
    onEdit?: (entity: T) => void
    onBack?: () => void
    onDelete?: React.ReactNode
    descriptionsProps?: Omit<DescriptionsProps, 'items'>
}

const EntityDetailView = <T extends Entity>(
    {
        data,
        isLoading,
        children,
        title,
        onEdit,
        onBack,
        onDelete,
        descriptionsProps
    }: EntityDetailViewProps<T>
) => {
    if (isLoading || !data) {
        return <Spin />
    }

    const auditItems: DescriptionsProps['items'] = [
        {key: 'id', label: ta().id, children: data.id},
        {key: 'createdBy', label: ta().createdBy, children: data.createdBy},
        {key: 'createdAt', label: ta().createdAt, children: data.createdAtStr},
        {key: 'updatedBy', label: ta().updatedBy, children: data.updatedBy},
        {key: 'updatedAt', label: ta().updatedAt, children: data.updatedAtStr},
    ]

    const entityItems = children(data)
    const items = [...(entityItems ?? []), ...auditItems]

    return (
        <>
            <Descriptions
                title={title ?? ta().detail}
                bordered
                column={1}
                items={items}
                {...descriptionsProps}
            />
            <Space style={{marginTop: 16}}>
                {onBack && (
                    <Button onClick={onBack}>
                        {ta().backToList}
                    </Button>
                )}
                {onEdit && (
                    <Button type="primary" onClick={() => onEdit(data)}>
                        {ta().edit}
                    </Button>
                )}
                {onDelete}
            </Space>
        </>
    )
}

export default EntityDetailView
