import {type Codec, debug, type Entity, type EntityUpdateData, requiredThunk} from "lib-entity-support";
import {type DefaultValues, type FieldValues, useForm, type UseFormReturn} from "react-hook-form";
import React from "react";
import {Alert, Form, type FormProps, Input} from "antd";
import z from "zod";
import {Either as E} from 'effect'
import {zodResolver} from "@hookform/resolvers/zod";
import ButtonFormItem from "./form/ButtonFormItem.tsx";
import InputNumberFormItem from "./form/InputNumberFormItem.tsx";

type EntityUpdateFormProps<T extends Entity, FORM_DATA extends FieldValues> = {
    data: T
    schema: z.core.$ZodType<FORM_DATA, FORM_DATA>
    codec: Codec<FORM_DATA, EntityUpdateData<T>>,
    onSubmit: (data: EntityUpdateData<T>) => void,
    children: (
        ufr: UseFormReturn<FORM_DATA>,
        required: (key: string) => boolean
    ) => React.ReactNode
    hasRole: boolean
    formProps?: FormProps
}

const isPrimitive = (v: unknown) =>
    v === null || (typeof v !== "object" && typeof v !== "function") || v instanceof Date;

const EntityUpdateForm = <T extends Entity, FORM_DATA extends FieldValues>(
    {
        data,
        schema,
        codec,
        onSubmit,
        children,
        hasRole,
        formProps
    }: EntityUpdateFormProps<T, FORM_DATA>) => {

    const formData: FORM_DATA = (() => {
        const decoded = codec.decode(data).pipe(E.getOrElse(() => ({} as FORM_DATA)))
        const isValidData = Object.entries(decoded).reduce((acc, [key, value]) => {
            const primitive = isPrimitive(value)
            if (!primitive) {
                debug([key, value], `Form 데이터는 원시 타입만 지원합니다.`)
            }
            return acc && primitive
        }, true)
        if (!isValidData) {
            debug(decoded, 'Form에 유효한 데이터가 없습니다. 객체나 배열은 지원하지 않습니다.')
        }
        return decoded
    })()

    const ufr = useForm<FORM_DATA>({
        resolver: zodResolver(schema),
        defaultValues: formData as DefaultValues<FORM_DATA>,
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
        return hasRole ? '수정' : '권한이 없습니다'
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
            <InputNumberFormItem
                fieldKey={'id' as any}
                labelName={'아이디'}
                ufr={ufr}
                inputProps={{disabled: true}}
            />
            {children(ufr, required)}
            <Form.Item label={'생성자'}>
                <Input disabled value={data.createdBy}/>
            </Form.Item>
            <Form.Item label={'생성일시'}>
                <Input disabled value={data.createdAtStr}/>
            </Form.Item>
            <Form.Item label={'수정자'}>
                <Input disabled value={data.updatedBy}/>
            </Form.Item>
            <Form.Item label={'수정일시'}>
                <Input disabled value={data.updatedAtStr}/>
            </Form.Item>
            <ButtonFormItem text={buttonText}
                            valid={hasRole && isDirty && isValid && !isSubmitting}/>
        </Form>
    )
}

export default EntityUpdateForm
