import {type ApiRoleDefinition, Entity, type IdentifiableDto, type RevisionDto, type UpdateForm} from "./entity.ts";
import {
    type AxiosRequestConfigExt,
    defaultManyHandler,
    defaultOneHandler,
    RemoteClient
} from "./remoteClient.ts";
import {type RoleDefinition, type RoleError, roleHandler} from "./role.ts";
import {Either as E} from 'effect'
import type {ObjectSetter} from "./builder.ts";
import {debug, EMPTY_FUNC, idParameterResolverForPromise} from "./utils.ts";
import {t} from "./i18n.ts";
import {QueryParam, QueryParamStringCodec} from "./queryParam.ts";
import {isPage, type Page, type ServerEntityApiResponse, transformPage} from "./response.ts";
import type {AxiosRequestConfig} from "axios";

export abstract class Repository<E extends Entity, D extends IdentifiableDto, CF, UF extends UpdateForm> {

    protected constructor(readonly remoteClient: RemoteClient) {
    }

    abstract entityName: string
    abstract tableName: string
    abstract basePath: string
    abstract role: ApiRoleDefinition

    abstract convert(dto: D): E

    hasRole(roleDef: RoleDefinition): E.Either<boolean, RoleError> {
        return roleHandler.hasRole(roleDef)
    }

    findById(
        id: number | string | undefined,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
    ): Promise<E.Either<E, string>> {
        return idParameterResolverForPromise(_id =>
            this.remoteClient.search<D>(config => {
                this.setupConfigForGet(config)
                config.url(`/${this.basePath}/${_id}`)
                configuration(config)
            }).execute(this.role.findById).then(this.readOneHandler))(id)
    }

    findWithById<T>(
        transform: (entity: E) => Promise<E.Either<T, string>>
    ): (id: number | string | undefined,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void
    ) => Promise<E.Either<T, string>> {
        return async (id: number | string | undefined,
                      configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
        ) => {
            const entity = await idParameterResolverForPromise(
                _id => this.remoteClient.search<D>(config => {
                    this.setupConfigForGet(config)
                    config.url(`/${this.basePath}/${_id}`)
                    configuration(config)
                }).execute(this.role.findById).then(this.readOneHandler))(id)
            return E.match(entity, {
                onLeft: (e) => Promise.resolve(E.left(e)),
                onRight: (entity) => transform(entity)
            })
        }
    }

    page(
        configParam: (q: QueryParam) => void,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
    ): Promise<E.Either<Page<E>, string>> {
        return this.pageByEncodedQueries(this.generateEncodedQueries(configParam), configuration)
    }

    pageWith<T>(
        transform: (entity: E) => Promise<E.Either<T, string>>
    ): (configParam: (q: QueryParam) => void,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void
    ) => Promise<E.Either<Page<T>, string>> {
        return (configParam: (q: QueryParam) => void,
                configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
        ) => this.pageByEncodedQueriesExtend<T>(this.generateEncodedQueries(configParam), transform, configuration)
    }

    create(
        formDataConfig: (os: ObjectSetter<CF>) => void,
        configuration: (os: ObjectSetter<AxiosRequestConfig>) => void = EMPTY_FUNC
    ): Promise<E.Either<ServerEntityApiResponse, string>> {
        return this.remoteClient.submit<ServerEntityApiResponse, CF>(
            formDataConfig,
            (config) => {
                config.method('POST')
                config.url(`/${this.basePath}`)

                configuration(config)
            }).execute(this.role.create).then(this.createHandler)
    }

    update(
        formDataConfig: (os: ObjectSetter<UF>) => void,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
    ): Promise<E.Either<ServerEntityApiResponse, string>> {
        return this.remoteClient.submit<ServerEntityApiResponse, UF>(
            formDataConfig,
            (config) => {
                config.method('PUT')
                config.url(`/${this.basePath}`)

                configuration(config)
            }).execute(this.role.update).then(this.updateHandler)
    }

    delete(
        formDataConfig: (os: ObjectSetter<UF>) => void,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
    ): Promise<E.Either<ServerEntityApiResponse, string>> {
        if (!this.role.delete) {
            return Promise.resolve(E.left(t().entityDeleteNotSupported(this.entityName)))
        }
        return this.remoteClient.submit<ServerEntityApiResponse, UF>(
            formDataConfig,
            (config, form) => {
                config.method('DELETE')
                config.url(`/${this.basePath}/${form.id}`)

                configuration(config)
            }).execute(this.role.delete).then(this.deleteHandler)
    }

    revisions(
        id: number | string | undefined,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
    ): Promise<E.Either<Array<RevisionDto<D>>, string>> {
        if (!this.role.revision) {
            return Promise.resolve(E.left(t().entityRevisionNotSupported(this.entityName)))
        }
        return idParameterResolverForPromise(_id =>
            this.remoteClient.search<Array<RevisionDto<D>>>((config) => {
                this.setupConfigForGet(config)
                config.url(`/${this.basePath}/${_id}/revisions`)
                configuration(config)
            }).execute(this.role.revision!).then(this.revisionListHandler)
            )(id)
    }

    revisionPage(
        id: number | string | undefined,
        configParam: (q: QueryParam) => void,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
    ): Promise<E.Either<Page<RevisionDto<D>>, string>> {
        if (!this.role.revision) {
            return Promise.resolve(E.left(t().entityRevisionNotSupported(this.entityName)))
        }
        return idParameterResolverForPromise(_id =>
            this.revisionPageByEncodedQueries(_id, this.generateEncodedQueries(configParam), this.role.revision!, configuration))(id)
    }

    list(
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
    ): Promise<E.Either<Array<E>, string>> {
        if (!this.role.list) {
            return Promise.resolve(E.left(t().entityListNotSupported(this.entityName)))
        }
        return this.remoteClient.search<Array<D>>((config) => {
            this.setupConfigForGet(config)
            config.url(`/${this.basePath}`)
            configuration(config)
        }).execute(this.role.list!).then(this.readManyHandler)
    }

    readOneHandler = defaultOneHandler<D, E>(
        (response) => debug(this.convert(response.data), 'readOneHandler')
    )

    readManyHandler = defaultManyHandler<D, E>(
        (response) => {
            const data = isPage(response.data) ? response.data.content : response.data
            return data.map(this.convert)
        }
    )

    createHandler = defaultOneHandler<ServerEntityApiResponse, ServerEntityApiResponse>(
        response => response.data
    )
    updateHandler = this.createHandler
    deleteHandler = this.createHandler

    pageHandler = defaultOneHandler<Page<D>, Page<E>>((response) => {
        return debug(transformPage(response.data, this.convert))
    })

    revisionListHandler = defaultManyHandler<RevisionDto<D>, RevisionDto<D>>(
        (response) => debug(response.data, 'revision list data')
    )

    revisionHandler = defaultOneHandler<Page<RevisionDto<D>>, Page<RevisionDto<D>>>((response) => {
        return debug(transformPage(response.data, a => a), 'revision page data')
    })

    swaggerUrl() {
        const path = encodeURIComponent(`[TABLE] ${this.tableName}`)
        return `${this.remoteClient.apiUrl}/swagger-ui/index.html#/${path}`
    }

    private setupConfigForGet(config: ObjectSetter<AxiosRequestConfigExt>) {
        config.method('GET')
        config.baseURL(this.remoteClient.apiUrl)
    }

    private generateEncodedQueries(onBuild: (q: QueryParam) => void): string {
        const queryParam = QueryParam.of()
        onBuild(queryParam)
        queryParam.write('page', queryParam.readNumberOr('page', 1) - 1)
        return QueryParamStringCodec.encode(queryParam).pipe(E.match({
            onRight: (encoded) => debug(encoded, 'encoded params'),
            onLeft: (error) => debug('', `param encoding failed: ${error}`)
        }))
    }

    private pageByEncodedQueries(
        encodedQueries: string,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
    ): Promise<E.Either<Page<E>, string>> {
        return this.remoteClient.search<Page<D>>((config) => {
            this.setupConfigForGet(config)
            config.url(`/${this.basePath}${this.addQuestion(encodedQueries)}`)
            configuration(config)
        }).execute(this.role.page).then(this.pageHandler)
    }

    private revisionPageByEncodedQueries(
        id: number,
        encodedQueries: string,
        role: RoleDefinition,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
    ): Promise<E.Either<Page<RevisionDto<D>>, string>> {
        return this.remoteClient.search<Page<RevisionDto<D>>>((config) => {
            this.setupConfigForGet(config)
            config.url(`/${this.basePath}/${id}/revisions/page${this.addQuestion(encodedQueries)}`)
            configuration(config)
        }).execute(role).then(this.revisionHandler)
    }

    private pageByEncodedQueriesExtend<T>(
        encodedQueries: string,
        transform: (entity: E) => Promise<E.Either<T, string>>,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void = EMPTY_FUNC
    ): Promise<E.Either<Page<T>, string>> {
        return this.remoteClient.search<Page<D>>((config) => {
            this.setupConfigForGet(config)
            config.url(`/${this.basePath}${this.addQuestion(encodedQueries)}`)
            configuration(config)
        }).execute(this.role.page)
            .then(this.pageHandler)
            .then(page => E.match(page, {
                onLeft: (error) => Promise.resolve(E.left(error)),
                onRight: (_page): Promise<E.Either<Page<T>, string>> => Promise.all(_page.content.map(transform))
                    .then(transformed => Promise.resolve(E.map(E.all(transformed), t => ({
                        ..._page,
                        content: t
                    } as Page<T>)))),
            }))
    }

    appendFirst = (text: string, condition: (c: string) => boolean) => (target: string): string => {
        return condition(target) ? `${text}${target}` : target
    }

    addQuestion = this.appendFirst('?', str => !!str)
}
