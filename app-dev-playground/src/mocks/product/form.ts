import z from 'zod'
import { Either as E } from 'effect'
import type { Codec, EntityCreateData, EntityUpdateData } from 'lib-entity-support'
import type { ProductEntity } from './entity'

// --- Create Form ---

export const ProductCreateSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().min(0),
  category: z.string().min(1),
  description: z.string().optional().default(''),
  stock: z.coerce.number().int().min(0),
  active: z.coerce.boolean().default(true),
})

export type ProductCreateFormData = z.infer<typeof ProductCreateSchema>

export const ProductCreateCodec: Codec<ProductCreateFormData, EntityCreateData<ProductEntity>> = {
  encode: (form: ProductCreateFormData): E.Either<EntityCreateData<ProductEntity>, string> => {
    return E.right({
      name: form.name,
      price: form.price,
      category: form.category,
      description: form.description ?? '',
      stock: form.stock,
      active: form.active,
    })
  },
  decode: (data: EntityCreateData<ProductEntity>): E.Either<ProductCreateFormData, string> => {
    return E.right({
      name: data.name,
      price: data.price,
      category: data.category,
      description: data.description,
      stock: data.stock,
      active: data.active,
    })
  },
}

// --- Update Form ---

export const ProductUpdateSchema = z.object({
  id: z.coerce.number(),
  name: z.string().min(1),
  price: z.coerce.number().min(0),
  category: z.string().min(1),
  description: z.string().optional().default(''),
  stock: z.coerce.number().int().min(0),
  active: z.coerce.boolean().default(true),
})

export type ProductUpdateFormData = z.infer<typeof ProductUpdateSchema>

export const ProductUpdateCodec: Codec<ProductUpdateFormData, EntityUpdateData<ProductEntity>> = {
  encode: (form: ProductUpdateFormData): E.Either<EntityUpdateData<ProductEntity>, string> => {
    return E.right({
      id: form.id,
      name: form.name,
      price: form.price,
      category: form.category,
      description: form.description ?? '',
      stock: form.stock,
      active: form.active,
    })
  },
  decode: (data: EntityUpdateData<ProductEntity>): E.Either<ProductUpdateFormData, string> => {
    return E.right({
      id: data.id,
      name: data.name,
      price: data.price,
      category: data.category,
      description: data.description,
      stock: data.stock,
      active: data.active,
    })
  },
}
