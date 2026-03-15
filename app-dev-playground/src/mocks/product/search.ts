import z from 'zod'
import { Either as E } from 'effect'
import {
  QueryParam,
  type Codec,
  createAuditSearchSchema,
  applyAuditInQueryParam,
  retrieveAuditFromQueryParam,
} from 'lib-entity-support'

export const ProductSearchSchema = z.object({
  name: z.string().optional(),
  category: z.string().optional(),
  ...createAuditSearchSchema().shape,
})

export type ProductSearch = z.infer<typeof ProductSearchSchema>

export const ProductSearchCodec: Codec<ProductSearch, QueryParam> = {
  encode: (form: ProductSearch): E.Either<QueryParam, string> => {
    const q = QueryParam.of()
    if (form.name) q.write('name', form.name)
    if (form.category) q.write('category', form.category)
    applyAuditInQueryParam(form, q)
    return E.right(q)
  },
  decode: (q: QueryParam): E.Either<ProductSearch, string> => {
    return E.right({
      name: q.readStringOr('name', '') || undefined,
      category: q.readStringOr('category', '') || undefined,
      ...retrieveAuditFromQueryParam(q),
    })
  },
}
