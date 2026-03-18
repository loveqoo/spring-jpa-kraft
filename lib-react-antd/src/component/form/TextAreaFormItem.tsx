import FormItemWrapper, {type FormItemWrapperProps} from "./FormItemWrapper.tsx";
import type {TextAreaProps} from "antd/es/input";
import TextArea from "antd/es/input/TextArea";

export interface TextAreaFormItemProps<S extends Record<string, any>>
    extends Omit<FormItemWrapperProps<S>, 'children'> {
    rows?: number
    maxLength?: number
    textAreaProps?: TextAreaProps
}

const TextAreaFormItem = <S extends Record<string, any>>(
    {rows = 4, maxLength = 500, textAreaProps, ...rest}: TextAreaFormItemProps<S>
) => {
    return (
        <FormItemWrapper {...rest}>
            <TextArea rows={rows} maxLength={maxLength} {...textAreaProps} />
        </FormItemWrapper>
    )
}

export default TextAreaFormItem
