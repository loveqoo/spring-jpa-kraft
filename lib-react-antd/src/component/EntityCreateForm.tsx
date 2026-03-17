import {type Codec, type Entity, type EntityCreateData, requiredThunk} from "lib-entity-support";
import z from "zod";
import {type FieldValues, useForm, type UseFormReturn} from "react-hook-form";
import React from "react";
import {Alert, Form, type FormProps} from "antd";
import {zodResolver} from "@hookform/resolvers/zod";
import {Either as E} from 'effect'
import ButtonFormItem from "./form/ButtonFormItem.tsx";

type EntityCreateFormProps<T extends Entity, FORM_DATA extends FieldValues> = {
    schema: z.core.$ZodType<FORM_DATA, FORM_DATA>
    codec: Codec<FORM_DATA, EntityCreateData<T>>
    onSubmit: (data: EntityCreateData<T>) => void
    children: (
        ufr: UseFormReturn<FORM_DATA>,
        required: (key: string) => boolean
    ) => React.ReactNode
    hasRole: boolean
    formProps?: FormProps
}

const EntityCreateForm = <T extends Entity, FORM_DATA extends FieldValues>(
    {
        schema,
        codec,
        onSubmit,
        children,
        hasRole,
        formProps
    }: EntityCreateFormProps<T, FORM_DATA>) => {

    const ufr = useForm<FORM_DATA>({
        resolver: zodResolver(schema),
        mode: 'onChange'
    })

    const required = requiredThunk<FORM_DATA>(
        (schema as any).shape as Record<keyof FORM_DATA, z.ZodTypeAny>
    )

    const handleSubmit = (formData: FORM_DATA) => {
        ufr.clearErrors('root')
        const result = codec.encode(formData)
        if (E.isRight(result)) {
            onSubmit(result.right)
        } else {
            const error = result.left as unknown
            const errorMessage = typeof error === 'string' ? error : JSON.stringify(error)
            ufr.setError('root', {
                type: 'manual',
                message: `폼 데이터 변환 중 오류가 발생했습니다: ${errorMessage}`
            })
        }
    }

    const _debug = false // FIXME
    const {isDirty, isValid, isSubmitting} = ufr.formState
    const buttonText = (() => {
        if (_debug) {
            return `Dirty(${isDirty}), Valid:(${isValid}), isSubmitting:(${isSubmitting})`
        }
        return hasRole ? '생성' : '권한이 없습니다'
    })()

    return (
        <Form layout={'horizontal'} labelCol={{span: 3}} {...formProps}
              onFinish={() => ufr.handleSubmit(handleSubmit)()}>
            {ufr.formState.errors.root && (
                <Form.Item>
                    <Alert
                        title={'오류'}
                        description={ufr.formState.errors.root.message}
                        type="error"
                        showIcon
                        closable={{onClose: () => ufr.clearErrors('root')}}
                        style={{marginBottom: 16}}
                    />
                </Form.Item>
            )}
            {children(ufr, required)}
            <ButtonFormItem text={buttonText}
                            valid={hasRole && isDirty && isValid && !isSubmitting}/>
        </Form>
    )
}

export default EntityCreateForm;
