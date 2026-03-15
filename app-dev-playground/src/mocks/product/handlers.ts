import { http, HttpResponse } from 'msw'
import { productDb } from './data'
import { parseSorts } from '../db'
import type { ProductCreateForm, ProductUpdateForm } from './types'
import type { ServerEntityApiResponse } from 'lib-entity-support'

const now = () => new Date().toISOString()

export const productHandlers = [
  http.get('/api/products/:id/revisions/page', ({ request, params }) => {
    const id = Number(params.id)
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '0')
    const size = Number(url.searchParams.get('size') ?? '10')
    return HttpResponse.json(productDb.revisionPage(id, page, size))
  }),

  http.get('/api/products/:id/revisions', ({ params }) => {
    const id = Number(params.id)
    return HttpResponse.json(productDb.revisions(id))
  }),

  http.get('/api/products/:id', ({ params }) => {
    const id = Number(params.id)
    const product = productDb.findById(id)
    if (!product) {
      return HttpResponse.json(
        { status: 404, error: 'Not Found', message: `Product ${id} not found`, details: [] },
        { status: 404 },
      )
    }
    return HttpResponse.json(product)
  }),

  http.get('/api/products', ({ request }) => {
    const url = new URL(request.url)
    const page = Number(url.searchParams.get('page') ?? '0')
    const size = Number(url.searchParams.get('size') ?? '20')
    const sorts = parseSorts(url)
    return HttpResponse.json(productDb.page(page, size, sorts))
  }),

  http.post('/api/products', async ({ request }) => {
    const body = (await request.json()) as ProductCreateForm
    const created = productDb.create({
      ...body,
      createdAt: now(),
      updatedAt: now(),
      createdBy: 'dev',
      updatedBy: 'dev',
    })
    const response: ServerEntityApiResponse = {
      id: String(created.id),
      name: created.name,
      action: 'create',
    }
    return HttpResponse.json(response)
  }),

  http.put('/api/products', async ({ request }) => {
    const body = (await request.json()) as ProductUpdateForm
    const updated = productDb.update(body.id, {
      ...body,
      updatedAt: now(),
      updatedBy: 'dev',
    })
    if (!updated) {
      return HttpResponse.json(
        { status: 404, error: 'Not Found', message: `Product ${body.id} not found`, details: [] },
        { status: 404 },
      )
    }
    const response: ServerEntityApiResponse = {
      id: String(updated.id),
      name: updated.name,
      action: 'update',
    }
    return HttpResponse.json(response)
  }),

  http.delete('/api/products/:id', ({ params }) => {
    const id = Number(params.id)
    const product = productDb.findById(id)
    if (!product) {
      return HttpResponse.json(
        { status: 404, error: 'Not Found', message: `Product ${id} not found`, details: [] },
        { status: 404 },
      )
    }
    productDb.delete(id)
    const response: ServerEntityApiResponse = {
      id: String(id),
      name: product.name,
      action: 'delete',
    }
    return HttpResponse.json(response)
  }),
]
