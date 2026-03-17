import FormItemWrapper, {type FormItemWrapperProps} from "./FormItemWrapper.tsx";
import {type CheckboxOptionType, Radio, type RadioGroupProps, type SpaceProps, Spin, type SpinProps} from "antd";
import type {CSSProperties} from "react";

export interface RadioGroupFormItemProps<S extends Record<string, any>>
    extends Omit<FormItemWrapperProps<S>, 'children'> {
    radioGroupProps?: RadioGroupProps
    options: (CheckboxOptionType | string | number)[]
    direction?: SpaceProps['direction']
    isLoading?: SpinProps['spinning']
    disabled?: RadioGroupProps['disabled']
    onChange?: RadioGroupProps['onChange']
}

const verticalStyle: CSSProperties = {
    display: 'flex',
    flexDirection: 'column',
    gap: 8
}

const RadioGroupFormItem = <S extends Record<string, any>>(
    {
        options, radioGroupProps, direction = 'horizontal',
        isLoading = false, disabled, onChange,
        ...rest
    }: RadioGroupFormItemProps<S>
) => {
    const style = direction === 'horizontal' ? undefined : verticalStyle
    return (
        <Spin spinning={isLoading}>
            <FormItemWrapper {...rest}>
                <Radio.Group
                    options={options}
                    style={style}
                    disabled={disabled}
                    onChange={onChange}
                    {...radioGroupProps}
                />
            </FormItemWrapper>
        </Spin>
    )
}

export default RadioGroupFormItem
