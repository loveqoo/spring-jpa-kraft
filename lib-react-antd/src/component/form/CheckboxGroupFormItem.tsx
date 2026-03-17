import FormItemWrapper, {type FormItemWrapperProps} from "./FormItemWrapper.tsx";
import type {CheckboxGroupProps} from "antd/es/checkbox";
import {Checkbox, type SpaceProps} from "antd";
import type {CSSProperties} from "react";

export interface CheckboxGroupFormItemProps<S extends Record<string, any>>
    extends Omit<FormItemWrapperProps<S>, 'children'> {
    options: CheckboxGroupProps['options']
    checkboxGroupProps?: CheckboxGroupProps
    direction?: SpaceProps['direction']
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
        direction = 'horizontal',
        ...rest
    }: CheckboxGroupFormItemProps<S>
) => {
    const style = direction === 'horizontal' ? undefined : verticalStyle
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
