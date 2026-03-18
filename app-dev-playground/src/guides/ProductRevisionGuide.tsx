import { Card } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { EntityRevisionTable } from 'lib-react-antd'
import type { RevisionDto } from 'lib-entity-support'
import type { ProductDto } from '../mocks/product/types'
import { ProductRepository } from '../mocks/product/repository'
import { remoteClient } from '../setup/remoteClientSetup'

const repo = new ProductRepository(remoteClient)

const extraColumns: ColumnsType<RevisionDto<ProductDto>> = [
  {
    title: '상품명',
    dataIndex: ['entity', 'name'],
    key: 'name',
  },
  {
    title: '가격',
    dataIndex: ['entity', 'price'],
    key: 'price',
    render: (v: number) => `$${v.toFixed(2)}`,
  },
  {
    title: '카테고리',
    dataIndex: ['entity', 'category'],
    key: 'category',
  },
]

export default function ProductRevisionGuide() {
  return (
    <Card title="Product Revision Guide">
      <EntityRevisionTable<ProductDto>
        entityId={1}
        useQuery={(configParam, options, configuration) =>
          repo.revisionPageOnUseQuery(1)(configParam, options, configuration)
        }
        extraColumns={extraColumns}
        title="Product #1 변경 이력"
      />
    </Card>
  )
}
