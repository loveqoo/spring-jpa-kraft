import { RepositoryWithCache } from 'lib-react-antd'
import type { ApiRoleDefinition, RemoteClient } from 'lib-entity-support'
import { ProductEntity } from './entity'
import type { ProductDto, ProductCreateForm, ProductUpdateForm } from './types'

const productRole: ApiRoleDefinition = {
  findById: {
    expression: '/api/products/{id}',
    regex: () => /^\/api\/products\/\d+$/,
    method: 'GET',
    roles: [],
    requiredAuth: false,
  },
  page: {
    expression: '/api/products',
    regex: () => /^\/api\/products$/,
    method: 'GET',
    roles: [],
    requiredAuth: false,
  },
  create: {
    expression: '/api/products',
    regex: () => /^\/api\/products$/,
    method: 'POST',
    roles: [],
    requiredAuth: false,
  },
  update: {
    expression: '/api/products',
    regex: () => /^\/api\/products$/,
    method: 'PUT',
    roles: [],
    requiredAuth: false,
  },
  delete: {
    expression: '/api/products/{id}',
    regex: () => /^\/api\/products\/\d+$/,
    method: 'DELETE',
    roles: [],
    requiredAuth: false,
  },
  revision: {
    expression: '/api/products/{id}/revisions',
    regex: () => /^\/api\/products\/\d+\/revisions/,
    method: 'GET',
    roles: [],
    requiredAuth: false,
  },
}

export class ProductRepository extends RepositoryWithCache<ProductEntity, ProductDto, ProductCreateForm, ProductUpdateForm> {
  readonly entityName = 'Product'
  readonly tableName = 'products'
  readonly basePath = 'api/products'
  readonly role = productRole

  constructor(remoteClient: RemoteClient) {
    super(remoteClient)
  }

  convert(dto: ProductDto): ProductEntity {
    return new ProductEntity(dto)
  }
}
