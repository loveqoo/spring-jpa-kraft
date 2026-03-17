import FormItemWrapper, {type FormItemWrapperProps} from "./FormItemWrapper.tsx";
import {Input, type InputProps} from "antd";

export interface InputFormItemProps<S extends Record<string, any>>
    extends Omit<FormItemWrapperProps<S>, 'children'> {
    inputProps?: InputProps
    disabled?: InputProps['disabled']
}

const InputFormItem = <S extends Record<string, any>>(
    {inputProps, disabled, ...rest}: InputFormItemProps<S>
) => {
    const _inputProps = {disabled, ...inputProps}
    return (
        <FormItemWrapper {...rest}>
            <Input {..._inputProps} />
        </FormItemWrapper>
    )
}

export default InputFormItem
