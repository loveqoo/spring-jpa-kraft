import {
    type AxiosRequestConfigExt,
    EMPTY_FUNC,
    type Entity,
    type IdentifiableDto,
    idParameterResolverForPromise,
    type ObjectSetter,
    type Page,
    type QueryParam,
    Repository,
    type RevisionDto,
    t,
    type UpdateForm
} from "lib-entity-support";
import {useQuery, type UseQueryOptions, type UseQueryResult} from "@tanstack/react-query";
import {Either as E} from 'effect'

export abstract class RepositoryWithCache<E extends Entity, D extends IdentifiableDto, CF, UF extends UpdateForm>
    extends Repository<E, D, CF, UF> {

    findByIdOnUseQuery(
        id: number | string | undefined,
        options: Omit<UseQueryOptions<E, string, E, readonly unknown[]>, 'queryKey' | 'queryFn'>,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
    ): UseQueryResult<E, string> {
        return useQuery<E, string>({
            ...options,
            queryKey: [this.entityName, 'findById', id],
            queryFn: async () => await this.findById(id, (os) => {
                configuration(os)
                os.useClientCache(false)
            }).then(data => {
                return E.isRight(data)
                    ? Promise.resolve(data.right)
                    : Promise.reject(`${this.entityName} 조회 실패 - ${data.left}`)
            })
        })
    }

    findWithByIdOnUseQuery<T>(
        transform: (entity: E) => Promise<E.Either<T, string>>
    ): (id: number | string | undefined,
        options: Omit<UseQueryOptions<T, string, T, readonly unknown[]>, 'queryKey' | 'queryFn'>,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void
    ) => UseQueryResult<T, string> {
        return (id: number | string | undefined,
                options: Omit<UseQueryOptions<T, string, T, readonly unknown[]>, 'queryKey' | 'queryFn'>,
                configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC) => {
            return useQuery<T, string>({
                ...options,
                queryKey: [this.entityName, 'findWithById', id],
                queryFn: async () => await this.findWithById(transform)(id, (os) => {
                    configuration(os)
                    os.useClientCache(false)
                }).then(data => {
                    return E.isRight(data)
                        ? Promise.resolve(data.right)
                        : Promise.reject(`${this.entityName} 조회 실패 - ${data.left}`)
                })
            })
        }
    }

    pageOnUseQuery(
        configParam: (q: QueryParam) => void,
        options: Omit<UseQueryOptions<Page<E>, string, Page<E>, readonly unknown[]>, 'queryKey' | 'queryFn'>,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
    ): UseQueryResult<Page<E>, string> {
        const encodedQueries = this.generateEncodedQueries(configParam)
        return useQuery<Page<E>, string>({
            ...options,
            queryKey: [this.entityName, 'page', encodedQueries],
            queryFn: async () => await this
                .pageByEncodedQueries(encodedQueries, (os) => {
                    configuration(os)
                    os.useClientCache(false)
                }).then(data => E.isRight(data)
                    ? Promise.resolve(data.right)
                    : Promise.reject(`${this.entityName} 조회 실패 - ${data.left}`))
        })
    }

    pageWithOnUseQuery<T>(
        transform: (entity: E) => Promise<E.Either<T, string>>
    ): (configParam: (q: QueryParam) => void,
        options: Omit<UseQueryOptions<Page<T>, string, Page<T>, readonly unknown[]>, 'queryKey' | 'queryFn'>,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void
    ) => UseQueryResult<Page<T>, string> {
        return (
            configParam: (q: QueryParam) => void,
            options: Omit<UseQueryOptions<Page<T>, string, Page<T>, readonly unknown[]>, 'queryKey' | 'queryFn'>,
            configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
        ) => {
            const encodedQueries = this.generateEncodedQueries(configParam)
            return useQuery<Page<T>, string>({
                ...options,
                queryKey: [this.entityName, 'pageWith', encodedQueries],
                queryFn: async () => await this
                    .pageByEncodedQueriesExtend(encodedQueries, transform, configuration)
                    .then(data => E.isRight(data)
                        ? Promise.resolve(data.right)
                        : Promise.reject(`${this.entityName} 조회 실패 - ${data.left}`))
            })
        }
    }

    revisionPageOnUseQuery(
        id: number | string | undefined
    ): (configParam: (q: QueryParam) => void,
        options: Omit<UseQueryOptions<Page<RevisionDto<D>>, string, Page<RevisionDto<D>>, readonly unknown[]>, 'queryKey' | 'queryFn'>,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void
    ) => UseQueryResult<Page<RevisionDto<D>>, string> {
        return (configParam: (q: QueryParam) => void,
                options: Omit<UseQueryOptions<Page<RevisionDto<D>>, string, Page<RevisionDto<D>>, readonly unknown[]>, 'queryKey' | 'queryFn'>,
                configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC) => {
            const encodedQueries = this.generateEncodedQueries(configParam)
            return useQuery<Page<RevisionDto<D>>, string>({
                ...options,
                queryKey: [this.entityName, 'revisionPage', encodedQueries, id || 0],
                queryFn: async () => {
                    if (!this.role.revision) {
                        throw t().entityRevisionNotSupported(this.entityName)
                    }
                    const result = await idParameterResolverForPromise(_id =>
                        this.revisionPageByEncodedQueries(_id, encodedQueries, this.role.revision!, (os) => {
                            configuration(os)
                            os.useClientCache(false)
                        }))(id)
                    if (E.isRight(result)) {
                        return result.right
                    }
                    throw `${this.entityName} 조회 실패 - ${result.left}`
                }
            })
        }
    }

    listOnUseQuery(
        options: Omit<UseQueryOptions<Array<E>, string, Array<E>, readonly unknown[]>, 'queryKey' | 'queryFn'>,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
    ): UseQueryResult<Array<E>, string> {
        return useQuery<Array<E>, string>({
            ...options,
            queryKey: [this.entityName, 'list'],
            queryFn: async () => await this
                .list(configuration)
                .then(data => {
                    return E.isRight(data) ? Promise.resolve(data.right) : Promise.reject(`${this.entityName} 조회 실패 - ${data.left}`)
                })
        })
    }
}