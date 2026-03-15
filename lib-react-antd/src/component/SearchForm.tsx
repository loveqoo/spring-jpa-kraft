import {type Codec, debug, QueryParam} from "lib-entity-support";
import z from 'zod'
import {type DefaultValues, type FieldValues, useForm, type UseFormReturn} from "react-hook-form";
import React, {type Dispatch, type SetStateAction, useEffect, useState} from "react";
import type {DefaultOptionType} from 'antd/es/select'
import {zodResolver} from '@hookform/resolvers/zod'
import {useNavigate} from "react-router-dom";
import {Either as E} from 'effect'
import {Button, Checkbox, type CheckboxChangeEvent, Col, Flex, Form, Row, Select} from "antd";
import {debugCol, debugRow} from "./index.tsx";
import {SearchOutlined} from "@ant-design/icons";

export type SearchProps<S extends FieldValues> = {
    schema: z.core.$ZodType<S, S>
    codec: Codec<S, QueryParam>
    renderForm: (urf: UseFormReturn<S>, toggle: boolean) => React.ReactNode
    renderActions?: (ufr: UseFormReturn<S>) => React.ReactNode
    defaultValues?: DefaultValues<S>
}

export type SearchPropsExt = {
    emptyQueryParam: QueryParam
    queryParamState: [QueryParam, Dispatch<SetStateAction<QueryParam>>]
    columnOptions?: DefaultOptionType[]
    setHiddenColumnKeys?: Dispatch<SetStateAction<string[]>>
    creationPath?: string
}

export const SearchForm = <S extends FieldValues>(
    {
        schema,
        renderForm,
        renderActions,
        defaultValues,
        emptyQueryParam,
        queryParamState,
        codec,
        columnOptions,
        setHiddenColumnKeys,
        creationPath
    }: SearchProps<S> & SearchPropsExt
) => {
    const [queryParam, setQueryParam] = queryParamState
    const formReturn = useForm<S>({
        resolver: zodResolver(schema)
    })
    const {handleSubmit, reset} = formReturn
    const [toggle, setToggle] = useState<boolean>((() => {
        if (renderActions) {
            return false
        }
        return (queryParam.paramMap.has('createdBy')
            || queryParam.paramMap.has('createdAt')
            || queryParam.paramMap.has('updatedBy')
            || queryParam.paramMap.has('updatedAt'))
    })())
    const navigate = useNavigate()

    useEffect(() => {
        codec.decode(queryParam).pipe(E.map((s) => {
            reset({...defaultValues, ...omitNullish(s) as S})
        }))
        if (!renderActions) {
            const hasAudit = queryParam.paramMap.has('createdBy')
                || queryParam.paramMap.has('createdAt')
                || queryParam.paramMap.has('updatedBy')
                || queryParam.paramMap.has('updatedAt')
            setToggle(hasAudit)
        }
    }, [queryParam])

    const handlers = {
        onColumnKeyChange: (keys: string[]) => {
            columnOptions && setHiddenColumnKeys && setHiddenColumnKeys(keys)
        },
        onChangeToggle: (e: CheckboxChangeEvent) => {
            if (!renderActions) {
                setToggle(e.target.checked)
            }
        },
        onSubmit: (data: S) => {
            const p = codec.encode(data)
            if (E.isRight(p)) {
                setQueryParam(debug(p.right.overwriteBy(emptyQueryParam, false), 'merge'))
            }
        }
    }

    return (<Form variant={'underlined'} onFinish={handleSubmit(handlers.onSubmit)}>
        <Row gutter={{xs: 8, sm: 16, md: 24, lg: 32}}>
            <Col span={18} xs={18} sm={18} md={18} lg={18}>
                {renderForm(formReturn, toggle)}
            </Col>
            <Col span={6} xs={6} sm={6} md={6} lg={6}>
                {renderActions
                    ? renderActions(formReturn)
                    : <>
                        <Row justify={'end'} style={debugRow}>
                            <Flex wrap gap={'small'} align={'center'} justify={'space-between'}>
                                {columnOptions ?
                                    <Col span={6} xs={6} sm={6} md={3} lg={3} flex={'auto'} style={debugCol}>
                                        <Form.Item>
                                            <Checkbox checked={toggle} onChange={handlers.onChangeToggle}/>
                                        </Form.Item>
                                    </Col> : void (0)}
                                <Col span={6} xs={6} sm={6} md={10} lg={8} flex={'auto'} style={debugCol}>
                                    <Form.Item>
                                        <Button type={'primary'}
                                                icon={<SearchOutlined/>}
                                                htmlType={'submit'}
                                                style={{marginRight: '8px'}}>
                                            조회
                                        </Button>
                                    </Form.Item>
                                </Col>
                                <Col span={6} xs={6} sm={6} md={9} lg={7} flex={'auto'} style={debugCol}>
                                    <Form.Item>
                                        <Button onClick={() => {
                                            reset({} as S)
                                            setQueryParam(QueryParam.of(emptyQueryParam))
                                        }}>
                                            초기화
                                        </Button>
                                    </Form.Item>
                                </Col>
                                <Col span={6} xs={6} sm={6} md={9} lg={6} flex={'auto'} style={debugCol}>
                                    <Form.Item>
                                        {creationPath ? <Button onClick={() => {
                                            navigate(creationPath)
                                        }}>생성</Button> : <Button disabled>생성</Button>}
                                    </Form.Item>
                                </Col>
                            </Flex>
                        </Row>
                        {columnOptions && columnOptions.length > 9 ?
                            <Row justify={'end'} style={{...debugRow, display: toggle ? undefined : 'none'}}>
                                <Flex wrap gap={'small'} justify={'flex-end'} align={'center'}>
                                    <Col span={24} xs={24} sm={24} md={24} lg={24} flex={'auto'} style={debugCol}>
                                        <Form.Item label={'칼럼 제거'}>
                                            <Select<string[]>
                                                mode={'multiple'}
                                                style={{width: 120}}
                                                defaultValue={[]}
                                                onChange={handlers.onColumnKeyChange}
                                                options={columnOptions}
                                            />
                                        </Form.Item>
                                    </Col>
                                </Flex>
                            </Row>
                            : void (0)
                        }
                    </>
                }
            </Col>
        </Row>
    </Form>)
}


const omitNullish = <T extends Record<string, any>>(obj: T): Partial<T> => {
    return Object.fromEntries(
        Object.entries(obj).filter(([_, value]) => value != null)
    ) as Partial<T>
}