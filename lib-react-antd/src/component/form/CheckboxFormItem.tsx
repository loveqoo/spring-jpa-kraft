import FormItemWrapper, {type FormItemWrapperProps} from "./FormItemWrapper.tsx";
import {Checkbox, type CheckboxChangeEvent, type CheckboxProps} from "antd";
import React from "react";

export interface CheckboxFormItemProps<S extends Record<string, any>>
    extends Omit<FormItemWrapperProps<S>, 'children'> {
    checkboxProps?: CheckboxProps
    onChange?: (event: CheckboxChangeEvent) => void
}

const CheckboxFormItem = <S extends Record<string, any>>(
    {
        checkboxProps,
        onChange,
        ...rest
    }: CheckboxFormItemProps<S>
) => {
    return (
        <FormItemWrapper {...rest}>
            <CheckboxWrapper checkboxProps={checkboxProps} customOnChange={onChange}/>
        </FormItemWrapper>
    )
}

const CheckboxWrapper = React.forwardRef<
    any,
    CheckboxProps & {
    value?: boolean
    onChange?: (checked: boolean) => void
    checkboxProps?: CheckboxProps
    customOnChange?: (event: CheckboxChangeEvent) => void
}>(({value, onChange, checkboxProps, customOnChange, ...props}, ref) => {
    return (
        <Checkbox
            {...props}
            {...checkboxProps}
            ref={ref}
            checked={value || false}
            onChange={(e) => {
                onChange?.(e.target.checked)
                customOnChange?.(e)
            }}>
            {checkboxProps?.children}
        </Checkbox>
    )
})

export default CheckboxFormItem
