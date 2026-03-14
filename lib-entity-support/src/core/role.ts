import {Either as E, Function as F} from 'effect'
import type {AxiosRequestConfig} from "axios";
import {t} from "./i18n.ts";

export type URIMethod = 'GET' | 'POST' | 'PUT' | 'DELETE'

export type RoleDefinition = {
    expression: string
    regex: () => RegExp
    method: URIMethod
    roles: string[]
    requiredAuth: boolean
}

export const isRoleDefinition = (obj: any): obj is RoleDefinition => {
    return !!obj && typeof obj === 'object'
    && 'expression' in obj && typeof obj.expression === 'string'
    && 'regex' in obj && typeof obj.regex === 'function'
    && 'method' in obj && typeof obj.method === 'string'
    && 'roles' in obj && Array.isArray(obj.roles) && obj.roles.every((role: any) => typeof role === 'string')
    && 'requiredAuth' in obj && typeof obj.requiredAuth === 'boolean'
}

export type RoleError = {
    roleDef: RoleDefinition
    message: string
    reason?: string[]
}

export const isRoleError = (error: any): error is RoleError => {
    return !!error && typeof error === 'object'
    && 'roleDef' in error && isRoleDefinition(error.roleDef)
    && 'message' in error && typeof error.message === 'string'
}

export type UserInfo = {
    userId: string
    userName: string
    roles: string[]
}

export type RoleHandlerConfig = {
    userInfo: () => E.Either<UserInfo, string>
    hasRole: (userInfo: UserInfo, roleDef: RoleDefinition) => E.Either<boolean, RoleError>
}

export type RoleHandler = {
    userInfo: () => E.Either<UserInfo, string>
    hasRole: (roleDef: RoleDefinition) => E.Either<boolean, RoleError>
    hasRoleAfterValidation: (
        userInfo: UserInfo,
        config: AxiosRequestConfig,
        roleDef: RoleDefinition
    ) => E.Either<boolean, RoleError>
}

const validateMethod = (
    config: AxiosRequestConfig,
    roleDef: RoleDefinition
): E.Either<string, RoleError> => F.pipe(
    E.fromNullable(config.method, () => ({
        roleDef,
        message: t().roleInvalidMethod
    } as RoleError)),
    E.flatMap(method => {
        const upper = method.toUpperCase()
        return ['GET', 'POST', 'PUT', 'DELETE'].includes(upper)
            ? E.right(upper) : E.left({
                roleDef,
                message: t().roleUnsupportedMethod,
                reason: [t().roleConfigMethod(upper), t().roleSupportedMethods]
            } as RoleError)
    })
)

const validateUrl = (
    config: AxiosRequestConfig,
    roleDef: RoleDefinition
): E.Either<string, RoleError> => F.pipe(
    E.fromNullable(config.url, () => ({roleDef, message: t().roleInvalidUrl} as RoleError)),
    E.map(url => url.replace(/\?.*$/, '')),
    E.flatMap(url => url ? E.right(url) : E.left({
        roleDef,
        message: t().roleUrlRequired(url)
    } as RoleError))
)

export const createRoleHandler = (config: RoleHandlerConfig): RoleHandler => {

    const handler: RoleHandler = {
        userInfo: config.userInfo,

        hasRole: (roleDef: RoleDefinition): E.Either<boolean, RoleError> => F.pipe(
            handler.userInfo(),
            E.mapLeft(msg => ({roleDef, message: msg} as RoleError)),
            E.flatMap(userInfo => config.hasRole(userInfo, roleDef))
        ),

        hasRoleAfterValidation: (
            userInfo: UserInfo,
            axiosConfig: AxiosRequestConfig,
            roleDef: RoleDefinition
        ): E.Either<boolean, RoleError> => F.pipe(
            E.all([
                validateMethod(axiosConfig, roleDef),
                validateUrl(axiosConfig, roleDef),
            ]),
            E.flatMap(([method, url]) => {
                if (roleDef.method !== method) {
                    return E.left({
                        roleDef,
                        message: t().roleMethodMismatch,
                        reason: [t().roleRequestMethod(method), t().roleSupportedMethods]
                    } as RoleError)
                }
                if (!roleDef.regex().test(url)) {
                    return E.left({
                        roleDef,
                        message: t().roleUrlMismatch,
                        reason: [t().roleRequestMethod(method), t().roleDefinedExpression(roleDef.expression)]
                    } as RoleError)
                }
                return config.hasRole(userInfo, roleDef)
            })
        )
    }

    return handler
}

const defaultHasRole = (userInfo: UserInfo, roleDef: RoleDefinition): E.Either<boolean, RoleError> => {
    if (!roleDef.requiredAuth) {
        return E.right(true)
    }
    const hasMatch = roleDef.roles.some(required => userInfo.roles.includes(required))
    if (hasMatch) {
        return E.right(true)
    }
    return E.left({
        roleDef,
        message: t().roleNoPermission,
        reason: [t().roleRequired(roleDef.roles.join(', ')), t().roleOwned(userInfo.roles.join(', '))],
    })
}

export let roleHandler: RoleHandler = createRoleHandler({
    userInfo: () => E.right({userId: '', userName: '', roles: [] as string[]}),
    hasRole: defaultHasRole,
})

export const initRoleHandler = (config: RoleHandlerConfig): void => {
    roleHandler = createRoleHandler(config)
}

export {defaultHasRole}
