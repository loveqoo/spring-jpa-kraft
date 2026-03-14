import {z} from 'zod'
import {t} from './i18n.ts'
import {Option as O} from 'effect'
import {QueryParam} from './queryParam.ts'
import dayjs from 'dayjs'

// dayjs format: T is output as a literal character (no escaping needed unlike Java's 'T')
const AUDIT_DATE_FORMAT = 'YYYY-MM-DDTHH:mm:ss'

const AuditField = {
    createdBy: 'createdBy',
    createdAt: 'createdAt',
    updatedBy: 'updatedBy',
    updatedAt: 'updatedAt',
} as const

export const IdSchema = z.object({
    id: z.number().gt(0),
})

const auditStringField = () => z.string().nullish().optional().refine(
    v => !v || v.length >= 3,
    {error: t().auditMinLength}
)

export const createAuditSearchSchema = () => z.object({
    [AuditField.createdBy]: auditStringField(),
    [AuditField.createdAt]: z.date().nullish().optional(),
    [AuditField.updatedBy]: auditStringField(),
    [AuditField.updatedAt]: z.date().nullish().optional(),
})

export const AuditSearchSchema = createAuditSearchSchema()

export type AuditSearchType = z.infer<typeof AuditSearchSchema>

export const applyAuditInQueryParam = (
    data: AuditSearchType,
    queryParam: QueryParam
): QueryParam => {
    if (data.createdBy != null) queryParam.write(AuditField.createdBy, data.createdBy)
    if (data.createdAt != null) queryParam.write(AuditField.createdAt, dayjs(data.createdAt).format(AUDIT_DATE_FORMAT))
    if (data.updatedBy != null) queryParam.write(AuditField.updatedBy, data.updatedBy)
    if (data.updatedAt != null) queryParam.write(AuditField.updatedAt, dayjs(data.updatedAt).format(AUDIT_DATE_FORMAT))
    return queryParam
}

export const retrieveAuditFromQueryParam = (
    queryParam: QueryParam
): AuditSearchType => ({
    createdBy: queryParam.readString(AuditField.createdBy).pipe(O.getOrElse((): null => null)),
    createdAt: queryParam.readDate(AuditField.createdAt).pipe(O.getOrElse((): null => null)),
    updatedBy: queryParam.readString(AuditField.updatedBy).pipe(O.getOrElse((): null => null)),
    updatedAt: queryParam.readDate(AuditField.updatedAt).pipe(O.getOrElse((): null => null)),
})
