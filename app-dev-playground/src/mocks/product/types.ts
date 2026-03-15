import type { IdentifiableDto } from 'lib-entity-support'

export type ProductDto = IdentifiableDto & {
  name: string
  price: number
  category: string
  description: string
  stock: number
  active: boolean
}

export type ProductCreateForm = {
  name: string
  price: number
  category: string
  description: string
  stock: number
  active: boolean
}

export type ProductUpdateForm = {
  id: number
  name: string
  price: number
  category: string
  description: string
  stock: number
  active: boolean
}
