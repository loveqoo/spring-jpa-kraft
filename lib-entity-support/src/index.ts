export { builderOf, type ObjectSetter, type ObjectBuilder } from "./core/builder.ts"
export {
    type Codec, type Encoder, type Decoder,
    compareEncodedValues, IdentityCodec, encodeBy, decodeBy, filterPrimitiveFields
} from "./core/codec.ts"
export {
    Entity, FetchableEntity,
    type Identifiable, type IdentifiableExt, type IdentifiableDto,
    type ApiRoleDefinition, type UpdateForm,
    type RevisionDto, type RevisionMetadata, RevisionType
} from "./core/entity.ts"
export { toFormattedString, equalsIgnoreCase } from "./core/extensions.ts"
export {
    QueryParam, QueryParamStringCodec, QueryParamUrlSearchParamsCodec, equalsQueryParams
} from "./core/queryParam.ts"
export {
    RemoteClient, RemoteTask, defaultQueryClient,
    type AxiosRequestConfigExt, type RemoteError,
    responseHandlers, defaultIdentityHandler, defaultOneHandler, defaultManyHandler,
    allPagesOf
} from "./core/remoteClient.ts"
export { SortType, SortTypeSchema, type SortParam, SortParamSchema, SortParamCodec } from "./core/request.ts"
export {
    type Page, type Pageable, type Sort, isPage, transformPage,
    type ServerEntityApiResponse, type FieldErrorDetail, type ServerEntityApiErrorResponse,
    isServerEntityApiErrorResponse, SortSchema
} from "./core/response.ts"
export {
    type RoleDefinition, type RoleError, type UserInfo, type URIMethod,
    type RoleHandlerConfig, type RoleHandler,
    isRoleDefinition, isRoleError, roleHandler, createRoleHandler, initRoleHandler, defaultHasRole
} from "./core/role.ts"
export {
    debug, EMPTY_FUNC, callOnce,
    idParameterResolver, idParameterResolverForPromise, effectOps
} from "./core/utils.ts"
export { Repository } from "./core/repository.ts"
export { t, setLocale, getLocale, type SupportedLocale, type Messages } from "./core/i18n.ts"
export {
    IdSchema, AuditSearchSchema, createAuditSearchSchema,
    applyAuditInQueryParam, retrieveAuditFromQueryParam
} from "./core/schema.ts"
