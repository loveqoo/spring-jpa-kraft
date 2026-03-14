import axios, {type AxiosError, type AxiosRequestConfig, type AxiosResponse, isAxiosError} from "axios";
import {Either as E, Function as F} from 'effect'
import {isServerEntityApiErrorResponse, type Page, type ServerEntityApiErrorResponse} from "./response.ts";
import {isRoleError, type RoleDefinition, type RoleError, roleHandler, type UserInfo} from "./role.ts";
import {callOnce, EMPTY_FUNC} from "./utils.ts";
import {builderOf, type ObjectSetter} from "./builder.ts";
import {status} from '@http-util/status-i18n';
import {t, getLocale} from './i18n.ts';
import {QueryParam} from "./queryParam.ts";
import {QueryClient} from "@tanstack/query-core";

export const defaultQueryClient = new QueryClient({
    defaultOptions: {
        queries: {
            staleTime: 1000 * 60 * 5, // 5 mins
            gcTime: 1000 * 60 * 60, // 1 hour
        }
    }
})

export type RemoteError =
    | { type: 'axios'; error: AxiosError<ServerEntityApiErrorResponse>; message: string }
    | { type: 'role'; message: string }
    | { type: 'internal'; message: string }

const toRemoteError = (e: unknown): RemoteError => {
    if (isAxiosError<ServerEntityApiErrorResponse>(e)) {
        const response = e.response
        if (response && isServerEntityApiErrorResponse(response.data)) {
            return {type: 'axios', error: e, message: `[${response.data.status} ${response.data.error} on ${response.data.message}]`}
        }
        const statusLocale = getLocale() === 'ko' ? 'ko-kr' : 'en'
        const statusMessage = e.status ? status(e.status, statusLocale) : t().unknownError
        return {type: 'axios', error: e, message: `${statusMessage} (${e.code})`}
    }
    return {type: 'internal', message: String(e)}
}

const remoteErrorToString = (e: RemoteError): string => e.message

export interface AxiosRequestConfigExt<D = any> extends AxiosRequestConfig<D> {
    useClientCache?: boolean
    queryKey?: string[]
}

export class RemoteClient {

    readonly queryClient: QueryClient

    constructor(readonly apiUrl: string, queryClient?: QueryClient) {
        this.queryClient = queryClient ?? defaultQueryClient
    }

    search<RESPONSE>(
        configuration: (os: ObjectSetter<AxiosRequestConfigExt>) => void): RemoteTask<RESPONSE> {
        return new RemoteTask<RESPONSE>(
            () => builderOf<AxiosRequestConfigExt>().on(configuration).build(),
            async (config: AxiosRequestConfigExt) => {
                if (!config.baseURL) config.baseURL = this.apiUrl
                if (!config.method) config.method = 'GET'
                try {
                    if (config.useClientCache ?? false) {
                        return await this.queryClient.fetchQuery({
                            queryKey: config.queryKey ?? ['search', `${config.baseURL}${config.method}${config.url}`],
                            queryFn: () => axios.request<RESPONSE, AxiosResponse<RESPONSE>, any>(config)
                                .then(res => E.right(res))
                        })
                    } else {
                        return await axios.request<RESPONSE, AxiosResponse<RESPONSE>, any>(config)
                            .then(res => E.right(res))
                    }
                } catch (e) {
                    return E.left(toRemoteError(e))
                }
            }
        )
    }

    submit<RESPONSE, FORM_DATA = any>(
        configFormData: (os: ObjectSetter<FORM_DATA>) => void,
        configuration: (os: ObjectSetter<AxiosRequestConfigExt<FORM_DATA>>, form: FORM_DATA) => void = EMPTY_FUNC
    ): RemoteTask<RESPONSE> {
        return new RemoteTask<RESPONSE>(
            () => F.pipe(
                builderOf<FORM_DATA>().on(configFormData).build(),
                E.flatMap((formData) =>
                    builderOf<AxiosRequestConfigExt<FORM_DATA>>()
                        .on((builder) => configuration(builder.data(formData), formData))
                        .build())),
            async (config: AxiosRequestConfigExt) => {
                if (!config.baseURL) config.baseURL = this.apiUrl
                if (!config.method) config.method = 'POST'
                try {
                    return await axios.request<RESPONSE, AxiosResponse<RESPONSE, FORM_DATA>, FORM_DATA>(config)
                        .then(async res => {
                            await this.queryClient.invalidateQueries()
                            return E.right(res)
                        })
                } catch (e) {
                    return E.left(toRemoteError(e))
                }
            }
        )
    }
}

export class RemoteTask<T> {
    constructor(
        readonly supplyConfig: () => E.Either<AxiosRequestConfigExt, never>,
        readonly runRemote: (config: AxiosRequestConfigExt) => Promise<E.Either<AxiosResponse<T>, RemoteError>>
    ) {
    }

    configAfterRoleCheck = callOnce(
        (userInfo: UserInfo, roleDef: RoleDefinition) => F.pipe(
            this.supplyConfig(),
            E.flatMap(config => F.pipe(
                roleHandler.hasRoleAfterValidation(userInfo, config, roleDef),
                E.flatMap(checked => {
                    if (checked) {
                        config.withCredentials = true
                        return E.right(config)
                    } else {
                        return E.left({
                            roleDef: roleDef,
                            message: t().roleUrlNoPermission(config.url ?? '')
                        } as RoleError)
                    }
                })
            ))
        )
    )

    execute(
        roleDefinition: RoleDefinition,
        onError: (roleError: RoleError) => string = roleError => `${roleError.roleDef.method}:${roleError.roleDef.expression}\r\n${roleError.message}\r\n${roleError.reason?.join('\r\n') || ''}`
    ): Promise<E.Either<AxiosResponse<T>, RemoteError>> {
        return F.pipe(
            roleHandler.userInfo(),
            E.flatMap(userInfo => this.configAfterRoleCheck(userInfo, roleDefinition)),
            E.map(config => this.runRemote(config)),
            E.getOrElse((e) => {
                const message = isRoleError(e) ? onError(e) : String(e)
                return Promise.resolve(E.left({type: 'role', message} as RemoteError))
            })
        )
    }
}

export const responseHandlers = {
    identity: <RESPONSE>(
        onSuccess: (res: AxiosResponse<RESPONSE>) => RESPONSE = (res) => res.data,
        onError: (e: RemoteError) => string = remoteErrorToString
    ) => (
        dto: E.Either<AxiosResponse<RESPONSE>, RemoteError>
    ): E.Either<RESPONSE, string> => F.pipe(dto, E.mapLeft(onError), E.map(onSuccess)),
    one: <RESPONSE, RESULT>(
        onSuccess: (res: AxiosResponse<RESPONSE>) => RESULT,
        onError: (e: RemoteError) => string = remoteErrorToString
    ) => (
        dto: E.Either<AxiosResponse<RESPONSE>, RemoteError>
    ): E.Either<RESULT, string> => F.pipe(dto, E.mapLeft(onError), E.map(onSuccess)),
    many: <RESPONSE, RESULT>(
        onSuccess: (res: AxiosResponse<RESPONSE[]>) => RESULT[],
        onError: (e: RemoteError) => string = remoteErrorToString
    ) => (
        dto: E.Either<AxiosResponse<RESPONSE[]>, RemoteError>
    ): E.Either<RESULT[], string> => F.pipe(dto, E.mapLeft(onError), E.map(onSuccess))
}

export const defaultIdentityHandler = <T>() => responseHandlers.identity<T>()
export const defaultOneHandler = responseHandlers.one
export const defaultManyHandler = responseHandlers.many

export const allPagesOf = <T, S = any>(
    f: (queryParam: QueryParam) => Promise<E.Either<Page<T>, string>>,
    transform: (t: T) => S,
    queryParam: QueryParam = QueryParam.of().write('page', 1).write('size', 50),
    maxCallCount: number = 10,
    result: T[] = []
): Promise<E.Either<S[], string>> => {
    const inner = (
        _queryParam: QueryParam,
        currentCount: number,
        _result: T[]
    ): Promise<E.Either<S[], string>> => f(_queryParam)
        .then(pageResult => E.match(pageResult, {
            onLeft: (error) => Promise.resolve(E.left(error)),
            onRight: (page) => {
                if (page.content && page.content.length > 0) {
                    _result.push(...page.content)
                    if (page.last || maxCallCount <= currentCount) {
                        return Promise.resolve(E.right(_result.map(transform)))
                    } else {
                        return inner(_queryParam.write('page', page.number + 2), currentCount + 1, _result)
                    }
                } else {
                    return Promise.resolve(E.right(_result.map(transform)))
                }
            }
        }))
    return inner(queryParam, 0, result)
}
