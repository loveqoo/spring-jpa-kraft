import { Entity } from 'lib-entity-support'
import type { ProductDto } from './types'

export class ProductEntity extends Entity {
  readonly name: string
  readonly price: number
  readonly category: string
  readonly description: string
  readonly stock: number
  readonly active: boolean

  constructor(dto: ProductDto) {
    super(dto)
    this.name = dto.name
    this.price = dto.price
    this.category = dto.category
    this.description = dto.description
    this.stock = dto.stock
    this.active = dto.active
  }
}
