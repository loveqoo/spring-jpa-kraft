import FormItemWrapper, {type FormItemWrapperProps} from "./FormItemWrapper.tsx";
import type {SearchProps} from "antd/es/input";
import {Input} from "antd";

export interface InputSearchFormItemProps<S extends Record<string, any>>
    extends Omit<FormItemWrapperProps<S>, 'children'> {
    searchProps?: SearchProps
    disabled?: SearchProps['disabled']
    enterButton?: SearchProps['enterButton']
    onSearch?: SearchProps['onSearch']
}

const InputSearchFormItem = <S extends Record<string, any>>(
    {
        searchProps,
        disabled,
        enterButton,
        onSearch,
        ...rest
    }: InputSearchFormItemProps<S>
) => {
    const _searchProps = {
        disabled,
        enterButton,
        onSearch,
        ...searchProps
    }
    return (
        <FormItemWrapper {...rest}>
            <Input.Search {..._searchProps} />
        </FormItemWrapper>
    )
}

export default InputSearchFormItem
