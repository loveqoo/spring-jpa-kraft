import FormItemWrapper, {type FormItemWrapperProps} from "./FormItemWrapper.tsx";
import type {DefaultOptionType} from "antd/es/select";
import type {SelectProps} from "antd/lib";
import {Select} from "antd";

export interface SelectFormItemProps<S extends Record<string, any>>
    extends Omit<FormItemWrapperProps<S>, 'disabled'> {
    options: DefaultOptionType[]
    isLoading?: boolean
    selectProps?: SelectProps<S>
    onChange?: SelectProps['onChange']
    disabled?: SelectProps['disabled']
}

const SelectFormItem = <S extends Record<string, any>>(
    {
        options,
        isLoading,
        selectProps,
        onChange,
        disabled,
        ...rest
    }: SelectFormItemProps<S>
) => {
    const _isLoading = isLoading ?? false
    const _selectProps = {onChange, disabled, ...selectProps}

    return (
        <FormItemWrapper {...rest}>
            <Select
                options={options}
                loading={isLoading}
                placeholder={_isLoading ? '로딩 중...' : '선택'}
                {..._selectProps}
            />
        </FormItemWrapper>
    )
}

export default SelectFormItem
