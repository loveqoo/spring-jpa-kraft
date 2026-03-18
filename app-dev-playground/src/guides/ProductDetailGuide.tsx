import { Card, message } from 'antd'
import type { DescriptionsProps } from 'antd'
import { EntityDetailView, EntityDeleteButton } from 'lib-react-antd'
import { ProductEntity } from '../mocks/product/entity'
import { ProductRepository } from '../mocks/product/repository'
import { remoteClient } from '../setup/remoteClientSetup'
import { builderOf } from 'lib-entity-support'
import { Either as E } from 'effect'

const repo = new ProductRepository(remoteClient)

const renderDetail = (entity: ProductEntity): DescriptionsProps['items'] => [
  { key: 'name', label: '상품명', children: entity.name },
  { key: 'price', label: '가격', children: `$${entity.price.toFixed(2)}` },
  { key: 'category', label: '카테고리', children: entity.category },
  { key: 'description', label: '설명', children: entity.description },
  { key: 'stock', label: '재고', children: entity.stock },
  { key: 'active', label: '활성화', children: entity.active ? 'Yes' : 'No' },
]

export default function ProductDetailGuide() {
  const { data, isLoading } = repo.findByIdOnUseQuery(1)

  return (
    <Card title="Product Detail Guide">
      <EntityDetailView<ProductEntity>
        data={data}
        isLoading={isLoading}
        title="Product Detail"
        onEdit={(entity) => message.info(`Edit product: ${entity.name}`)}
        onBack={() => message.info('Back to list')}
        onDelete={
          data ? (
            <EntityDeleteButton<ProductEntity>
              entity={data}
              entityName={data.name}
              onDelete={(id) =>
                repo.delete(builderOf({ id } as any))
              }
              onSuccess={() => message.success('삭제되었습니다.')}
              onError={(err) => message.error(err)}
              hasRole
            />
          ) : undefined
        }
      >
        {renderDetail}
      </EntityDetailView>
    </Card>
  )
}
