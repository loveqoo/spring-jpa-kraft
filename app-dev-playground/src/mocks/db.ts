import type { Page, RevisionDto, RevisionMetadata } from 'lib-entity-support'

type SortSpec = {
  field: string
  direction: 'asc' | 'desc'
}

type RevisionEntry<T> = {
  revisionNumber: number
  revisionType: 'INSERT' | 'UPDATE' | 'DELETE'
  timestamp: number
  entity: T
}

export class MockDb<T extends { id: number }> {
  private data: Map<number, T>
  private nextId: number
  private revisionLog: Map<number, RevisionEntry<T>[]> = new Map()
  private revisionSeq = 0

  constructor(seed: T[]) {
    this.data = new Map(seed.map((item) => [item.id, item]))
    this.nextId = seed.length > 0 ? Math.max(...seed.map((s) => s.id)) + 1 : 1
    seed.forEach((item) => {
      this.addRevision(item.id, 'INSERT', item)
    })
  }

  private addRevision(entityId: number, type: 'INSERT' | 'UPDATE' | 'DELETE', entity: T) {
    const entries = this.revisionLog.get(entityId) ?? []
    entries.push({
      revisionNumber: ++this.revisionSeq,
      revisionType: type,
      timestamp: Date.now(),
      entity: { ...entity },
    })
    this.revisionLog.set(entityId, entries)
  }

  findById(id: number): T | undefined {
    return this.data.get(id)
  }

  findAll(): T[] {
    return Array.from(this.data.values())
  }

  create(item: Omit<T, 'id'>): T {
    const id = this.nextId++
    const entity = { ...item, id } as T
    this.data.set(id, entity)
    this.addRevision(id, 'INSERT', entity)
    return entity
  }

  update(id: number, partial: Partial<T>): T | undefined {
    const existing = this.data.get(id)
    if (!existing) return undefined
    const updated = { ...existing, ...partial, id }
    this.data.set(id, updated)
    this.addRevision(id, 'UPDATE', updated)
    return updated
  }

  delete(id: number): boolean {
    const existing = this.data.get(id)
    if (!existing) return false
    this.addRevision(id, 'DELETE', existing)
    return this.data.delete(id)
  }

  page(pageNum: number, pageSize: number, sorts?: SortSpec[]): Page<T> {
    let items = this.findAll()

    if (sorts && sorts.length > 0) {
      items = [...items].sort((a, b) => {
        for (const sort of sorts) {
          const aVal = (a as Record<string, unknown>)[sort.field]
          const bVal = (b as Record<string, unknown>)[sort.field]
          let cmp = 0
          if (typeof aVal === 'string' && typeof bVal === 'string') {
            cmp = aVal.localeCompare(bVal)
          } else if (typeof aVal === 'number' && typeof bVal === 'number') {
            cmp = aVal - bVal
          }
          if (cmp !== 0) return sort.direction === 'desc' ? -cmp : cmp
        }
        return 0
      })
    }

    const totalElements = items.length
    const totalPages = Math.max(1, Math.ceil(totalElements / pageSize))
    const start = pageNum * pageSize
    const content = items.slice(start, start + pageSize)

    return {
      content,
      pageable: {
        sort: { unsorted: !sorts?.length, sorted: !!sorts?.length, empty: !sorts?.length },
        pageNumber: pageNum,
        pageSize,
        offset: start,
        unpaged: false,
        paged: true,
      },
      totalPages,
      totalElements,
      last: pageNum >= totalPages - 1,
      numberOfElements: content.length,
      first: pageNum === 0,
      size: pageSize,
      number: pageNum,
      sort: { unsorted: !sorts?.length, sorted: !!sorts?.length, empty: !sorts?.length },
      empty: content.length === 0,
    }
  }

  revisions(entityId: number): RevisionDto<T>[] {
    const entries = this.revisionLog.get(entityId) ?? []
    return entries.map((entry) => this.toRevisionDto(entry))
  }

  revisionPage(entityId: number, pageNum: number, pageSize: number): Page<RevisionDto<T>> {
    const all = this.revisions(entityId)
    const totalElements = all.length
    const totalPages = Math.max(1, Math.ceil(totalElements / pageSize))
    const start = pageNum * pageSize
    const content = all.slice(start, start + pageSize)

    return {
      content,
      pageable: {
        sort: { unsorted: true, sorted: false, empty: true },
        pageNumber: pageNum,
        pageSize,
        offset: start,
        unpaged: false,
        paged: true,
      },
      totalPages,
      totalElements,
      last: pageNum >= totalPages - 1,
      numberOfElements: content.length,
      first: pageNum === 0,
      size: pageSize,
      number: pageNum,
      sort: { unsorted: true, sorted: false, empty: true },
      empty: content.length === 0,
    }
  }

  private toRevisionDto(entry: RevisionEntry<T>): RevisionDto<T> {
    const instant = new Date(entry.timestamp).toISOString()
    const metadata: RevisionMetadata = {
      revisionNumber: entry.revisionNumber,
      revisionType: entry.revisionType,
      delegate: {
        id: entry.revisionNumber,
        timestamp: entry.timestamp,
      },
      revisionInstant: instant,
      requiredRevisionNumber: entry.revisionNumber,
      requiredRevisionInstant: instant,
    }
    return {
      metadata,
      entity: entry.entity,
      revisionNumber: entry.revisionNumber,
      revisionInstant: instant,
      requiredRevisionNumber: entry.revisionNumber,
      requiredRevisionInstant: instant,
    }
  }
}

export const parseSorts = (url: URL): SortSpec[] => {
  const sorts: SortSpec[] = []
  url.searchParams.getAll('sort').forEach((s) => {
    const [field, dir] = s.split(',')
    if (field) {
      sorts.push({ field, direction: dir === 'desc' ? 'desc' : 'asc' })
    }
  })
  return sorts
}
