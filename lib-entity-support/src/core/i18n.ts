import * as z from 'zod'

export type SupportedLocale = 'ko' | 'en'

const messages = {
    ko: {
        // entity.ts — RevisionType
        revisionInsert: '생성',
        revisionUpdate: '수정',
        revisionDelete: '삭제',

        // utils.ts — idParameterResolver
        idNotProvided: (name: string) => `적절한 ${name}(이)가 제공되지 않았습니다.`,
        idInvalidFormat: (key: string, id: string, name: string) => `(${key}:${id}) 적절한 ${name} 형식 및 타입이 아닙니다.`,
        idInvalidValue: (key: string, id: number, name: string) => `(${key}:${id}) 적절한 ${name} 값이 아닙니다.`,
        idDefaultName: '아이디',

        // role.ts
        roleInvalidMethod: '유효한 메소드가 아닙니다.',
        roleUnsupportedMethod: '지원하지 않는 메소드',
        roleInvalidUrl: '유효한 주소가 아닙니다',
        roleUrlRequired: (url: string) => `권한을 체크하기 위해서는 유효한 주소로 질의해야 합니다 - URL(${url})`,
        roleMethodMismatch: '사유: 요청 메소드가 일치하지 않습니다',
        roleUrlMismatch: '사유: 요청 URL이 정의된 형식에 일치하지 않습니다.',
        roleNoPermission: '권한이 없습니다.',
        roleRequired: (required: string) => `필요한 역할: ${required}`,
        roleOwned: (owned: string) => `보유한 역할: ${owned}`,
        roleConfigMethod: (method: string) => `설정: ${method}`,
        roleSupportedMethods: '지원: GET, POST, PUT, DELETE',
        roleRequestMethod: (method: string) => `요청: ${method}`,
        roleDefinedExpression: (expression: string) => `정의: ${expression}`,
        roleUrlNoPermission: (url: string) => `${url}에 대한 권한이 없습니다.`,

        // repository.ts
        entityDeleteNotSupported: (name: string) => `삭제 기능이 지원되지 않는 엔티티 입니다 - ${name}`,
        entityRevisionNotSupported: (name: string) => `오딧 기능이 지원되지 않는 엔티티 입니다 - ${name}`,
        entityListNotSupported: (name: string) => `전체 리스트 기능이 지원되지 않는 엔티티 입니다 - ${name}`,

        // remoteClient.ts
        unknownError: '알 수 없음',

        // schema.ts
        auditMinLength: '최소 3자리 이상이어야 합니다.',
    },
    en: {
        revisionInsert: 'Created',
        revisionUpdate: 'Updated',
        revisionDelete: 'Deleted',

        idNotProvided: (name: string) => `A valid ${name} was not provided.`,
        idInvalidFormat: (key: string, id: string, name: string) => `(${key}:${id}) Invalid ${name} format or type.`,
        idInvalidValue: (key: string, id: number, name: string) => `(${key}:${id}) Invalid ${name} value.`,
        idDefaultName: 'ID',

        roleInvalidMethod: 'Invalid method.',
        roleUnsupportedMethod: 'Unsupported method',
        roleInvalidUrl: 'Invalid URL.',
        roleUrlRequired: (url: string) => `A valid URL is required for permission check - URL(${url})`,
        roleMethodMismatch: 'Reason: Request method does not match.',
        roleUrlMismatch: 'Reason: Request URL does not match the defined pattern.',
        roleNoPermission: 'Permission denied.',
        roleRequired: (required: string) => `Required roles: ${required}`,
        roleOwned: (owned: string) => `Owned roles: ${owned}`,
        roleConfigMethod: (method: string) => `Configured: ${method}`,
        roleSupportedMethods: 'Supported: GET, POST, PUT, DELETE',
        roleRequestMethod: (method: string) => `Request: ${method}`,
        roleDefinedExpression: (expression: string) => `Defined: ${expression}`,
        roleUrlNoPermission: (url: string) => `No permission for ${url}.`,

        entityDeleteNotSupported: (name: string) => `Delete is not supported for entity - ${name}`,
        entityRevisionNotSupported: (name: string) => `Revision is not supported for entity - ${name}`,
        entityListNotSupported: (name: string) => `List is not supported for entity - ${name}`,

        unknownError: 'Unknown error',

        auditMinLength: 'Must be at least 3 characters.',
    }
}

export type Messages = typeof messages['ko']

let currentLocale: SupportedLocale = 'ko'

export const t = (): Messages => messages[currentLocale]

export const getLocale = (): SupportedLocale => currentLocale

export const setLocale = (locale: SupportedLocale): void => {
    currentLocale = locale
    if (locale in z.locales) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        z.config((z.locales as any)[locale]())
    }
}
