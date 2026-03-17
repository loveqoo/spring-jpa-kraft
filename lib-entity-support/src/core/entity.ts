import {toFormattedString} from "./extensions.ts";
import {Either as E, Function as F, identity} from 'effect';
import {effectOps} from "./utils.ts";
import type {RoleDefinition} from "./role.ts";
import {t} from "./i18n.ts";

export interface Identifiable {
    readonly id: number
    readonly createdAt: Date
    readonly updatedAt: Date
    readonly createdBy: string
    readonly updatedBy: string
}

export interface IdentifiableExt extends Identifiable {
    readonly createdAtStr: string
    readonly updatedAtStr: string
}

export interface IdentifiableDto {
    readonly id: number
    readonly createdAt: string
    readonly updatedAt: string
    readonly createdBy: string
    readonly updatedBy: string
}

export const RevisionType = {
    get INSERT() {
        return t().revisionInsert
    },
    get UPDATE() {
        return t().revisionUpdate
    },
    get DELETE() {
        return t().revisionDelete
    },
}

export type RevisionType = keyof typeof RevisionType

export type RevisionMetadata = {
    revisionNumber: number,
    revisionType: RevisionType,
    delegate: {
        id: number,
        timestamp: number,
    }
    revisionInstant: string
    requiredRevisionNumber: number
    requiredRevisionInstant: string
}

export type RevisionDto<T> = {
    metadata: RevisionMetadata,
    entity: T,
    revisionNumber: number
    revisionInstant: string
    requiredRevisionNumber: number
    requiredRevisionInstant: string
}

export type UpdateForm = { id: number }

export abstract class Entity implements IdentifiableExt {
    readonly id: number
    readonly createdAt: Date
    readonly updatedAt: Date
    readonly createdBy: string
    readonly updatedBy: string
    readonly createdAtStr: string
    readonly updatedAtStr: string

    protected constructor(dto: IdentifiableDto) {
        const identifiable = this.convert(dto)
        this.id = identifiable.id
        this.createdAt = identifiable.createdAt
        this.createdBy = identifiable.createdBy
        this.updatedAt = identifiable.updatedAt
        this.updatedBy = identifiable.updatedBy
        this.createdAtStr = toFormattedString(this.createdAt)
        this.updatedAtStr = toFormattedString(this.updatedAt)
    }

    protected convert = (dto: IdentifiableDto): Identifiable => ({
        id: dto.id,
        createdAt: new Date(dto.createdAt),
        createdBy: dto.createdBy,
        updatedAt: new Date(dto.updatedAt),
        updatedBy: dto.updatedBy
    })
}

export abstract class FetchableEntity<T> extends Entity {
    abstract fetch(useCache?: boolean): Promise<E.Either<T, string>>

    async fetchWith<S = T>(
        transform: (t: T) => S = identity as (t: T) => S,
        useCache?: boolean
    ): Promise<E.Either<S, string>> {
        return this.buildFetchWith(this.fetch.bind(this), transform, useCache)
    }

    async buildFetchWith<R, S = R>(
        fetch: (useCache?: boolean) => Promise<E.Either<R, string>>,
        transform: (t: R) => S = identity as (t: R) => S,
        useCache?: boolean
    ) {
        return F.pipe(
            await fetch(useCache),
            E.flatMap(fetchGroup => effectOps.tryToEither<S, string>(
                () => transform(fetchGroup)
            ))
        )
    }
}

export type ApiRoleDefinition = {
    findById: RoleDefinition
    page: RoleDefinition
    create: RoleDefinition
    update: RoleDefinition
    delete: RoleDefinition
    list?: RoleDefinition
    revision?: RoleDefinition
}

type EntityProps<T> = Pick<T, {
    [K in keyof T]: T[K] extends Function ? never : K;
}[keyof T]>

export type EntityCreateData<E extends Entity> = EntityProps<Omit<E, 'id' | 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'createdAtStr' | 'updatedAtStr' | 'versionNo'>>
export type EntityUpdateData<E extends Entity> = EntityProps<Omit<E, 'createdAt' | 'createdBy' | 'updatedAt' | 'updatedBy' | 'createdAtStr' | 'updatedAtStr' | 'versionNo'>>
