import {Controller, type Path, type RegisterOptions, type UseFormReturn} from "react-hook-form";
import {Form, type FormItemProps} from "antd";
import React from "react";

export type FormItemWrapperProps<S extends Record<string, any>> = {
    ufr: UseFormReturn<S>
    fieldKey: Path<S>
    labelName?: string
    labelNames?: Record<string, string>
    required?: (key: string) => boolean
    formItemProps?: FormItemProps<S>
    rules?: RegisterOptions<S, Path<S>>
    children: React.ReactElement
}

export default function FormItemWrapper<S extends Record<string, any>>(
    {
        fieldKey,
        labelName,
        labelNames,
        ufr,
        required,
        formItemProps,
        rules,
        children
    }: FormItemWrapperProps<S>
) {
    const {control} = ufr
    const _labelName = (() => {
        if (labelName) {
            return labelName
        } else if (labelNames) {
            return labelNames[fieldKey as string]
        } else {
            return ''
        }
    })()
    return (
        <Controller
            control={control}
            name={fieldKey}
            rules={rules}
            render={({field, fieldState}) => {
                const errorMessage = fieldState.error?.message || ''
                return (
                    <Form.Item
                        label={_labelName}
                        required={required ? required(fieldKey) : false}
                        help={errorMessage}
                        validateStatus={fieldState.error ? 'error' : 'success'}
                        {...formItemProps}>
                        {React.cloneElement(children, {
                            ...field,
                            onChange: (e: any) => {
                                field.onChange(e) // React Hook Form onChange
                                const customOnChange = (children.props as any)?.onChange
                                if (customOnChange) {
                                    customOnChange(e)
                                }
                            }
                        } as any)}
                    </Form.Item>
                )
            }}
        />
    )
}