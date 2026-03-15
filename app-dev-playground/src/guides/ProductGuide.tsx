import { Card, Input, Select, Tag, Form, Col, Row } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import type { UseFormReturn } from 'react-hook-form'
import { BasicTable, renderAuditSearchForm } from 'lib-react-antd'
import type { AuditSearchSchema } from 'lib-entity-support'
import { ProductRepository } from '../mocks/product/repository'
import { ProductEntity } from '../mocks/product/entity'
import { remoteClient } from '../setup/remoteClientSetup'
import {
  ProductSearchSchema,
  ProductSearchCodec,
  type ProductSearch,
} from '../mocks/product/search'

const repo = new ProductRepository(remoteClient)

const columns: ColumnsType<ProductEntity> = [
  { title: 'ID', dataIndex: 'id', key: 'id', width: 60 },
  { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
  {
    title: 'Price',
    dataIndex: 'price',
    key: 'price',
    sorter: true,
    render: (v: number) => `$${v.toFixed(2)}`,
  },
  { title: 'Category', dataIndex: 'category', key: 'category', sorter: true },
  { title: 'Stock', dataIndex: 'stock', key: 'stock', width: 80 },
  {
    title: 'Active',
    dataIndex: 'active',
    key: 'active',
    width: 80,
    render: (v: boolean) => <Tag color={v ? 'green' : 'default'}>{v ? 'Yes' : 'No'}</Tag>,
  },
  { title: 'Created', dataIndex: 'createdAtStr', key: 'createdAtStr' },
]

const categories = ['Electronics', 'Books', 'Clothing', 'Food', 'Sports']

const renderSearchForm = (form: UseFormReturn<ProductSearch>, toggle: boolean) => (<>
  <Row gutter={16}>
    <Col span={8}>
      <Form.Item label="Name">
        <Input {...form.register('name')} placeholder="Search by name" allowClear />
      </Form.Item>
    </Col>
    <Col span={8}>
      <Form.Item label="Category">
        <Select
          allowClear
          placeholder="Select category"
          options={categories.map((c) => ({ label: c, value: c }))}
          value={form.watch('category')}
          onChange={(v) => form.setValue('category', v)}
        />
      </Form.Item>
    </Col>
  </Row>
  {renderAuditSearchForm(form as unknown as UseFormReturn<AuditSearchSchema>, toggle)}
</>)

export default function ProductGuide() {
  return (
    <Card title="Product Guide">
      <BasicTable<ProductEntity, ProductSearch>
        useQuery={(configParam, options, configuration) =>
          repo.pageOnUseQuery(configParam, options, configuration)
        }
        columns={columns}
        colSort="id,asc"
        search={{
          schema: ProductSearchSchema,
          codec: ProductSearchCodec,
          renderForm: renderSearchForm,
        }}
      />
    </Card>
  )
}
