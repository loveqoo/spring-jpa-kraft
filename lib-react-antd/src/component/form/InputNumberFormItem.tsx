import FormItemWrapper, {type FormItemWrapperProps} from "./FormItemWrapper.tsx";
import type {SizeType} from "antd/es/config-provider/SizeContext";
import {InputNumber, type InputNumberProps} from "antd";

export interface InputNumberFormItemProps<S extends Record<string, any>>
    extends Omit<FormItemWrapperProps<S>, 'children'> {
    inputProps?: InputNumberProps
    size?: SizeType
}

const InputNumberFormItem = <S extends Record<string, any>>(
    {inputProps, size, ...rest}: InputNumberFormItemProps<S>
) => {
    return (
        <FormItemWrapper {...rest}>
            <InputNumber {...inputProps} size={size}/>
        </FormItemWrapper>
    )
}

export default InputNumberFormItem
