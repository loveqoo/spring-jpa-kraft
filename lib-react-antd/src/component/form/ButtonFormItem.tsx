import {Button, type ButtonProps, Form, type FormItemProps} from "antd";

type ButtonFormItemProps = {
    text: string
    valid: boolean
    formItemProps?: FormItemProps
    buttonProps?: ButtonProps
}

const ButtonFormItem = (
    {valid, formItemProps, buttonProps, text}: ButtonFormItemProps
) => {
    return (<Form.Item {...formItemProps}>
        <Button type={'primary'} htmlType={'submit'} disabled={!valid} {...buttonProps}>
            {text}
        </Button>
    </Form.Item>)
}

export default ButtonFormItem
