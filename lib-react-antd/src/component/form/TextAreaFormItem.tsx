import FormItemWrapper, {type FormItemWrapperProps} from "./FormItemWrapper.tsx";
import type {TextAreaProps} from "antd/es/input";
import TextArea from "antd/es/input/TextArea";

export interface TextAreaFormItemProps<S extends Record<string, any>>
    extends Omit<FormItemWrapperProps<S>, 'children'> {
    textAreaProps?: TextAreaProps
}

const TextAreaFormItem = <S extends Record<string, any>>(
    {textAreaProps, ...rest}: TextAreaFormItemProps<S>
) => {
    return (
        <FormItemWrapper {...rest}>
            <TextArea rows={4} maxLength={5} {...textAreaProps} />
        </FormItemWrapper>
    )
}

export default TextAreaFormItem
