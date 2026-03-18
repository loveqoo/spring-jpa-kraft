import {useState} from "react";
import {Button, type ButtonProps, Modal} from "antd";
import {ExclamationCircleOutlined} from "@ant-design/icons";
import {type Entity, type ServerEntityApiResponse} from "lib-entity-support";
import {Either as E} from 'effect'
import {ta} from "../i18n.ts";

type EntityDeleteButtonProps<T extends Entity> = {
    entity: T
    entityName: string
    onDelete: (id: number) => Promise<E.Either<ServerEntityApiResponse, string>>
    onSuccess?: (response: ServerEntityApiResponse) => void
    onError?: (error: string) => void
    hasRole: boolean
    buttonProps?: ButtonProps
}

const EntityDeleteButton = <T extends Entity>(
    {
        entity,
        entityName,
        onDelete,
        onSuccess,
        onError,
        hasRole,
        buttonProps
    }: EntityDeleteButtonProps<T>
) => {
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        setLoading(true)
        try {
            const result = await onDelete(entity.id)
            if (E.isRight(result)) {
                onSuccess?.(result.right)
            } else {
                onError?.(result.left)
            }
        } finally {
            setLoading(false)
        }
    }

    const showConfirm = () => {
        Modal.confirm({
            title: ta().deleteConfirmTitle,
            icon: <ExclamationCircleOutlined />,
            content: ta().deleteConfirmContent(entityName),
            okText: ta().delete,
            okType: 'danger',
            cancelText: ta().cancel,
            onOk: handleDelete,
        })
    }

    return (
        <Button
            danger
            disabled={!hasRole || loading}
            loading={loading}
            onClick={showConfirm}
            {...buttonProps}
        >
            {hasRole ? ta().delete : ta().noPermission}
        </Button>
    )
}

export default EntityDeleteButton
