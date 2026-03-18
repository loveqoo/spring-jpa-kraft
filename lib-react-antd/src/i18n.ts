import type { SupportedLocale } from 'lib-entity-support'
import { getLocale } from 'lib-entity-support'

const messages = {
  ko: {
    // EntityCreateForm / EntityUpdateForm
    create: '생성',
    update: '수정',
    noPermission: '권한이 없습니다',
    error: '오류',
    codecError: (detail: string) => `폼 데이터 변환 중 오류가 발생했습니다: ${detail}`,
    notFormBindable: (key: string) => `[${key}] Form에 바인딩할 수 없는 타입입니다.`,
    notFormBindableDetail: 'Form에 바인딩할 수 없는 데이터가 포함되어 있습니다.',

    // EntityUpdateForm — audit fields
    id: '아이디',
    createdBy: '생성자',
    createdAt: '생성일시',
    updatedBy: '수정자',
    updatedAt: '수정일시',

    // EntityDeleteButton
    delete: '삭제',
    deleteConfirmTitle: '삭제 확인',
    deleteConfirmContent: (name: string) => `"${name}"을(를) 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.`,
    deleteSuccess: '삭제되었습니다.',
    deleteFailed: (detail: string) => `삭제에 실패했습니다: ${detail}`,
    cancel: '취소',

    // EntityDetailView
    detail: '상세',
    edit: '수정',
    backToList: '목록으로',

    // EntityRevisionTable
    revisionNumber: '리비전',
    revisionType: '변경유형',
    revisionInstant: '변경일시',

    // SelectFormItem
    selectPlaceholder: '선택',
    selectLoading: '로딩 중...',
  },
  en: {
    create: 'Create',
    update: 'Update',
    noPermission: 'No permission',
    error: 'Error',
    codecError: (detail: string) => `Form data conversion error: ${detail}`,
    notFormBindable: (key: string) => `[${key}] Not a form-bindable type.`,
    notFormBindableDetail: 'Form data contains non-bindable values.',

    id: 'ID',
    createdBy: 'Created by',
    createdAt: 'Created at',
    updatedBy: 'Updated by',
    updatedAt: 'Updated at',

    delete: 'Delete',
    deleteConfirmTitle: 'Confirm Delete',
    deleteConfirmContent: (name: string) => `Are you sure you want to delete "${name}"? This action cannot be undone.`,
    deleteSuccess: 'Deleted successfully.',
    deleteFailed: (detail: string) => `Delete failed: ${detail}`,
    cancel: 'Cancel',

    detail: 'Detail',
    edit: 'Edit',
    backToList: 'Back to list',

    revisionNumber: 'Revision',
    revisionType: 'Change Type',
    revisionInstant: 'Changed At',

    selectPlaceholder: 'Select',
    selectLoading: 'Loading...',
  },
} satisfies Record<SupportedLocale, Record<string, string | ((...args: any[]) => string)>>

export type AntdMessages = typeof messages['ko']

export const ta = (): AntdMessages => messages[getLocale()]
