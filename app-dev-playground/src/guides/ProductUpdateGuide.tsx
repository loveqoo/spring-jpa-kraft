import { Card, Select, Switch, Form, message, Spin } from 'antd'
import type { UseFormReturn } from 'react-hook-form'
import { EntityUpdateForm, InputFormItem, InputNumberFormItem } from 'lib-react-antd'
import { ProductEntity } from '../mocks/product/entity'
import { ProductRepository } from '../mocks/product/repository'
import { remoteClient } from '../setup/remoteClientSetup'
import {
  ProductUpdateSchema,
  ProductUpdateCodec,
  type ProductUpdateFormData,
} from '../mocks/product/form'
import type { EntityUpdateData } from 'lib-entity-support'

const repo = new ProductRepository(remoteClient)
const categories = ['Electronics', 'Books', 'Clothing', 'Food', 'Sports']

const renderFormFields = (ufr: UseFormReturn<ProductUpdateFormData>, required: (key: string) => boolean) => (
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

export default function ProductUpdateGuide() {
  // 수정 가이드: id=1 상품을 조회하여 수정폼에 바인딩
  const { data, isLoading } = repo.findByIdOnUseQuery(1)

  if (isLoading || !data) {
    return <Card title="Product Update Guide"><Spin /></Card>
  }

  const handleSubmit = async (updateData: EntityUpdateData<ProductEntity>) => {
    try {
      await repo.update(updateData)
      message.success('상품이 수정되었습니다.')
    } catch {
      message.error('수정에 실패했습니다.')
    }
  }

  return (
    <Card title="Product Update Guide">
      <EntityUpdateForm<ProductEntity, ProductUpdateFormData>
        data={data}
        schema={ProductUpdateSchema}
        codec={ProductUpdateCodec}
        onSubmit={handleSubmit}
        hasRole={true}
      >
        {renderFormFields}
      </EntityUpdateForm>
    </Card>
  )
}
