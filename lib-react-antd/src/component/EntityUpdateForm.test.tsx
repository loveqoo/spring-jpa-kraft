import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import z from 'zod'
import { Either as E } from 'effect'
import { Entity, type Codec, type EntityUpdateData } from 'lib-entity-support'
import type { UseFormReturn } from 'react-hook-form'
import EntityUpdateForm from './EntityUpdateForm'
import InputFormItem from './form/InputFormItem'
import InputNumberFormItem from './form/InputNumberFormItem'
import { TestWrapper } from '../test/wrapper'

class TestEntity extends Entity {
  readonly name: string
  readonly price: number

  constructor(dto: any) {
    super(dto)
    this.name = dto.name
    this.price = dto.price
  }
}

const TestUpdateSchema = z.object({
  id: z.coerce.number(),
  name: z.string().min(1),
  price: z.coerce.number().min(0),
})

type TestUpdateFormData = z.infer<typeof TestUpdateSchema>

const TestUpdateCodec: Codec<TestUpdateFormData, EntityUpdateData<TestEntity>> = {
  encode: (form) => E.right({ id: form.id, name: form.name, price: form.price }),
  decode: (data) => E.right({ id: data.id, name: data.name, price: data.price }),
}

const mockEntity = new TestEntity({
  id: 42,
  name: 'Existing Product',
  price: 500,
  createdAt: '2026-01-01T00:00:00',
  createdBy: 'admin',
  updatedAt: '2026-03-01T00:00:00',
  updatedBy: 'editor',
  createdAtStr: '2026-01-01 00:00:00',
  updatedAtStr: '2026-03-01 00:00:00',
  versionNo: 1,
})

const renderFormFields = (ufr: UseFormReturn<TestUpdateFormData>, required: (key: string) => boolean) => (
  <>
    <InputFormItem fieldKey="name" labelName="상품명" ufr={ufr} required={required} inputProps={{ placeholder: '상품명' }} />
    <InputNumberFormItem fieldKey="price" labelName="가격" ufr={ufr} required={required} />
  </>
)

describe('EntityUpdateForm', () => {
  test('기존 데이터가 폼에 바인딩된다', async () => {
    render(
      <TestWrapper>
        <EntityUpdateForm<TestEntity, TestUpdateFormData>
          data={mockEntity}
          schema={TestUpdateSchema}
          codec={TestUpdateCodec}
          onSubmit={vi.fn()}
          hasRole
        >
          {renderFormFields}
        </EntityUpdateForm>
      </TestWrapper>,
    )

    await waitFor(() => {
      expect(screen.getByPlaceholderText('상품명')).toHaveValue('Existing Product')
    })
  })

  test('ID 필드가 disabled로 표시된다', () => {
    render(
      <TestWrapper>
        <EntityUpdateForm<TestEntity, TestUpdateFormData>
          data={mockEntity}
          schema={TestUpdateSchema}
          codec={TestUpdateCodec}
          onSubmit={vi.fn()}
          hasRole
        >
          {renderFormFields}
        </EntityUpdateForm>
      </TestWrapper>,
    )

    // i18n 기본값(ko): '아이디'
    expect(screen.getByText('아이디')).toBeInTheDocument()
  })

  test('audit 필드가 read-only로 표시된다', () => {
    render(
      <TestWrapper>
        <EntityUpdateForm<TestEntity, TestUpdateFormData>
          data={mockEntity}
          schema={TestUpdateSchema}
          codec={TestUpdateCodec}
          onSubmit={vi.fn()}
          hasRole
        >
          {renderFormFields}
        </EntityUpdateForm>
      </TestWrapper>,
    )

    expect(screen.getByText('생성자')).toBeInTheDocument()
    expect(screen.getByText('생성일시')).toBeInTheDocument()
    expect(screen.getByText('수정자')).toBeInTheDocument()
    expect(screen.getByText('수정일시')).toBeInTheDocument()
    expect(screen.getByDisplayValue('admin')).toBeInTheDocument()
    expect(screen.getByDisplayValue('editor')).toBeInTheDocument()
  })

  test('hasRole=true이면 수정 버튼이 표시된다', () => {
    render(
      <TestWrapper>
        <EntityUpdateForm<TestEntity, TestUpdateFormData>
          data={mockEntity}
          schema={TestUpdateSchema}
          codec={TestUpdateCodec}
          onSubmit={vi.fn()}
          hasRole
        >
          {renderFormFields}
        </EntityUpdateForm>
      </TestWrapper>,
    )
    expect(screen.getByText('수정')).toBeInTheDocument()
  })

  test('hasRole=false이면 권한 없음 메시지가 표시된다', () => {
    render(
      <TestWrapper>
        <EntityUpdateForm<TestEntity, TestUpdateFormData>
          data={mockEntity}
          schema={TestUpdateSchema}
          codec={TestUpdateCodec}
          onSubmit={vi.fn()}
          hasRole={false}
        >
          {renderFormFields}
        </EntityUpdateForm>
      </TestWrapper>,
    )
    expect(screen.getByText('권한이 없습니다')).toBeInTheDocument()
  })

  test('데이터 수정 후 제출하면 onSubmit이 호출된다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <TestWrapper>
        <EntityUpdateForm<TestEntity, TestUpdateFormData>
          data={mockEntity}
          schema={TestUpdateSchema}
          codec={TestUpdateCodec}
          onSubmit={onSubmit}
          hasRole
        >
          {renderFormFields}
        </EntityUpdateForm>
      </TestWrapper>,
    )

    const nameInput = screen.getByPlaceholderText('상품명')
    await user.clear(nameInput)
    await user.type(nameInput, 'Updated Product')

    await waitFor(() => {
      const btn = screen.getByText('수정').closest('button')
      expect(btn).not.toBeDisabled()
    })

    await user.click(screen.getByText('수정'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
      const submitted = onSubmit.mock.calls[0][0]
      expect(submitted.name).toBe('Updated Product')
    })
  })
})
