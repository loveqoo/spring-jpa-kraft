import FormItemWrapper, {type FormItemWrapperProps} from "./FormItemWrapper.tsx";
import {DatePicker, type DatePickerProps} from "antd";
import dayjs from 'dayjs'
import React from 'react'

export interface DatePickerFormItemProps<S extends Record<string, any>> extends Omit<FormItemWrapperProps<S>, 'children'> {
    datePickerProps?: DatePickerProps
}

const DatePickerFormItem = <S extends Record<string, any>>(
    {datePickerProps, ...rest}: DatePickerFormItemProps<S>
) => {
    return (
        <FormItemWrapper {...rest}>
            <DatePickerWrapper
                datePickerProps={datePickerProps}
            />
        </FormItemWrapper>
    )
}

const DatePickerWrapper = React.forwardRef<
    any,
    DatePickerProps & {
    value?: Date | null
    onChange?: (date: Date | null) => void
    datePickerProps?: DatePickerProps
}>(({value, onChange, datePickerProps, ...props}, ref) => {
    return (
        <DatePicker
            {...props}
            {...datePickerProps}
            ref={ref}
            value={value ? dayjs(value) : null}
            onChange={(date) => {
                onChange?.(date && !Array.isArray(date) ? date.toDate() : null)
            }}
        />
    )
})

export default DatePickerFormItem