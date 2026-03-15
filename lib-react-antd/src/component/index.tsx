import React from "react";
import type {AuditSearchSchema} from "lib-entity-support";
import type {UseFormReturn} from "react-hook-form";
import {Col, Flex, Row} from "antd";
import InputFormItem from "./form/InputFormItem.tsx";
import DatePickerFormItem from "./form/DatePickerFormItem.tsx";

export const debugRow: React.CSSProperties = {
    // border: '1px solid, #d9d9d9'
}

export const debugCol: React.CSSProperties = {
    // border: '1px solid, red'
}

export const renderAuditSearchForm = (
    ufr: UseFormReturn<AuditSearchSchema>,
    toggle: boolean
): React.ReactNode => {
    return (<Row gutter={{xs: 8, sm: 16, md: 24, lg: 32}} style={{...debugRow, display: toggle ? undefined : 'none'}}>
        <Flex wrap gap={'small'} align={'center'} justify={'space-between'}>
            <Col span={6} xs={6} sm={5} md={4} lg={5} flex={'auto'} style={debugCol}>
                <InputFormItem fieldKey={'createdBy'} labelName={'생성자'} ufr={ufr}/>
            </Col>
            <Col span={6} xs={6} sm={5} md={4} lg={6} flex={'auto'} style={debugCol}>
                <DatePickerFormItem fieldKey={'createdAt'} labelName={'생성일시'} ufr={ufr}
                                    datePickerProps={{showTime: true, format: 'YYYY-MM-DD HH:mm:ss'}}/>
            </Col>
            <Col span={6} xs={6} sm={5} md={4} lg={5} flex={'auto'} style={debugCol}>
                <InputFormItem fieldKey={'updatedBy'} labelName={'수정자'} ufr={ufr}/>
            </Col>
            <Col span={6} xs={6} sm={5} md={4} lg={6} flex={'auto'} style={debugCol}>
                <DatePickerFormItem fieldKey={'updatedAt'} labelName={'수정일시'} ufr={ufr}
                                    datePickerProps={{showTime: true, format: 'YYYY-MM-DD HH:mm:ss'}}/>
            </Col>
        </Flex>
    </Row>)
}