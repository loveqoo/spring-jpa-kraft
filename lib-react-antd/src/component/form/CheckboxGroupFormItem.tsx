import FormItemWrapper, {type FormItemWrapperProps} from "./FormItemWrapper.tsx";
import type {CheckboxGroupProps} from "antd/es/checkbox";
import {Checkbox} from "antd";
import type {CSSProperties} from "react";

export interface CheckboxGroupFormItemProps<S extends Record<string, any>>
    extends Omit<FormItemWrapperProps<S>, 'children'> {
    options: CheckboxGroupProps['options']
    checkboxGroupProps?: CheckboxGroupProps
    vertical?: boolean
}

const verticalStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
}

const CheckboxGroupFormItem = <S extends Record<string, any>>(
    {
        options,
        checkboxGroupProps,
        vertical = false,
        ...rest
    }: CheckboxGroupFormItemProps<S>
) => {
    const style = vertical ? verticalStyle : undefined
    return (
        <FormItemWrapper {...rest}>
            <Checkbox.Group
                options={options}
                style={style}
                {...checkboxGroupProps}
            />
        </FormItemWrapper>
    )
}

export default CheckboxGroupFormItem
