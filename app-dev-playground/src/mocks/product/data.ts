import { MockDb } from '../db'
import type { ProductDto } from './types'

const now = new Date().toISOString()

const categories = ['Electronics', 'Books', 'Clothing', 'Food', 'Sports']

const seedData: ProductDto[] = Array.from({ length: 25 }, (_, i) => ({
  id: i + 1,
  name: `Product ${String(i + 1).padStart(2, '0')}`,
  price: Math.round((10 + Math.random() * 990) * 100) / 100,
  category: categories[i % categories.length],
  description: `Description for product ${i + 1}`,
  stock: Math.floor(Math.random() * 200),
  active: i % 5 !== 0,
  createdAt: now,
  updatedAt: now,
  createdBy: 'system',
  updatedBy: 'system',
}))

export const productDb = new MockDb(seedData)
