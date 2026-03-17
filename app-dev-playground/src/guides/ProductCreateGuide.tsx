import { Card, Select, Switch, Form, message } from 'antd'
import type { UseFormReturn } from 'react-hook-form'
import { EntityCreateForm, InputFormItem, InputNumberFormItem } from 'lib-react-antd'
import { ProductEntity } from '../mocks/product/entity'
import { ProductRepository } from '../mocks/product/repository'
import { remoteClient } from '../setup/remoteClientSetup'
import {
  ProductCreateSchema,
  ProductCreateCodec,
  type ProductCreateFormData,
} from '../mocks/product/form'
import type { EntityCreateData } from 'lib-entity-support'

const repo = new ProductRepository(remoteClient)
const categories = ['Electronics', 'Books', 'Clothing', 'Food', 'Sports']

const renderFormFields = (ufr: UseFormReturn<ProductCreateFormData>, required: (key: string) => boolean) => (
  <>
    <InputFormItem fieldKey="name" labelName="상품명" ufr={ufr} required={required} />
    <InputNumberFormItem fieldKey="price" labelName="가격" ufr={ufr} required={required} />
    <Form.Item label="카테고리" required={required('category')}>
      <Select
        placeholder="카테고리 선택"
        options={categories.map((c) => ({ label: c, value: c }))}
        value={ufr.watch('category')}
        onChange={(v) => ufr.setValue('category', v, { shouldValidate: true, shouldDirty: true })}
      />
    </Form.Item>
    <InputFormItem fieldKey="description" labelName="설명" ufr={ufr} required={required} />
    <InputNumberFormItem fieldKey="stock" labelName="재고" ufr={ufr} required={required} />
    <Form.Item label="활성화">
      <Switch
        checked={ufr.watch('active')}
        onChange={(v) => ufr.setValue('active', v, { shouldValidate: true, shouldDirty: true })}
      />
    </Form.Item>
  </>
)

export default function ProductCreateGuide() {
  const handleSubmit = async (data: EntityCreateData<ProductEntity>) => {
    try {
      await repo.create(data)
      message.success('상품이 생성되었습니다.')
    } catch {
      message.error('생성에 실패했습니다.')
    }
  }

  return (
    <Card title="Product Create Guide">
      <EntityCreateForm<ProductEntity, ProductCreateFormData>
        schema={ProductCreateSchema}
        codec={ProductCreateCodec}
        onSubmit={handleSubmit}
        hasRole={true}
      >
        {renderFormFields}
      </EntityCreateForm>
    </Card>
  )
}
