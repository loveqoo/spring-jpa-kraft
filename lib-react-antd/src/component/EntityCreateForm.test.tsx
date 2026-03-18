import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import z from 'zod'
import { Either as E } from 'effect'
import { Entity, type Codec, type EntityCreateData } from 'lib-entity-support'
import type { UseFormReturn } from 'react-hook-form'
import EntityCreateForm from './EntityCreateForm'
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

const TestCreateSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().min(0),
})

type TestCreateFormData = z.infer<typeof TestCreateSchema>

const TestCreateCodec: Codec<TestCreateFormData, EntityCreateData<TestEntity>> = {
  encode: (form) => E.right({ name: form.name, price: form.price }),
  decode: (data) => E.right({ name: data.name, price: data.price }),
}

const FailingCodec: Codec<TestCreateFormData, EntityCreateData<TestEntity>> = {
  encode: () => E.left('변환 실패'),
  decode: (data) => E.right({ name: data.name, price: data.price }),
}

const renderFormFields = (ufr: UseFormReturn<TestCreateFormData>, required: (key: string) => boolean) => (
  <>
    <InputFormItem fieldKey="name" labelName="상품명" ufr={ufr} required={required} inputProps={{ placeholder: '상품명' }} />
    <InputNumberFormItem fieldKey="price" labelName="가격" ufr={ufr} required={required} />
  </>
)

describe('EntityCreateForm', () => {
  test('폼이 렌더링된다', () => {
    render(
      <TestWrapper>
        <EntityCreateForm<TestEntity, TestCreateFormData>
          schema={TestCreateSchema}
          codec={TestCreateCodec}
          onSubmit={vi.fn()}
          hasRole
        >
          {renderFormFields}
        </EntityCreateForm>
      </TestWrapper>,
    )
    expect(screen.getByPlaceholderText('상품명')).toBeInTheDocument()
    expect(screen.getByText('가격')).toBeInTheDocument()
  })

  test('hasRole=true이면 생성 버튼이 표시된다', () => {
    render(
      <TestWrapper>
        <EntityCreateForm<TestEntity, TestCreateFormData>
          schema={TestCreateSchema}
          codec={TestCreateCodec}
          onSubmit={vi.fn()}
          hasRole
        >
          {renderFormFields}
        </EntityCreateForm>
      </TestWrapper>,
    )
    expect(screen.getByText('생성')).toBeInTheDocument()
  })

  test('hasRole=false이면 권한 없음 메시지가 표시된다', () => {
    render(
      <TestWrapper>
        <EntityCreateForm<TestEntity, TestCreateFormData>
          schema={TestCreateSchema}
          codec={TestCreateCodec}
          onSubmit={vi.fn()}
          hasRole={false}
        >
          {renderFormFields}
        </EntityCreateForm>
      </TestWrapper>,
    )
    expect(screen.getByText('권한이 없습니다')).toBeInTheDocument()
  })

  test('유효한 데이터 입력 후 제출하면 onSubmit이 호출된다', async () => {
    const user = userEvent.setup()
    const onSubmit = vi.fn()

    render(
      <TestWrapper>
        <EntityCreateForm<TestEntity, TestCreateFormData>
          schema={TestCreateSchema}
          codec={TestCreateCodec}
          onSubmit={onSubmit}
          hasRole
        >
          {renderFormFields}
        </EntityCreateForm>
      </TestWrapper>,
    )

    await user.type(screen.getByPlaceholderText('상품명'), 'Test Product')
    const priceInput = screen.getByRole('spinbutton')
    await user.type(priceInput, '1000')

    // 버튼 활성화 대기
    await waitFor(() => {
      const btn = screen.getByText('생성').closest('button')
      expect(btn).not.toBeDisabled()
    })

    await user.click(screen.getByText('생성'))

    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalled()
      const submitted = onSubmit.mock.calls[0][0]
      expect(submitted.name).toBe('Test Product')
      expect(submitted.price).toBe(1000)
    })
  })

  test('codec.encode가 실패하면 에러 Alert이 표시된다', async () => {
    const user = userEvent.setup()

    render(
      <TestWrapper>
        <EntityCreateForm<TestEntity, TestCreateFormData>
          schema={TestCreateSchema}
          codec={FailingCodec}
          onSubmit={vi.fn()}
          hasRole
        >
          {renderFormFields}
        </EntityCreateForm>
      </TestWrapper>,
    )

    await user.type(screen.getByPlaceholderText('상품명'), 'Test')
    const priceInput = screen.getByRole('spinbutton')
    await user.type(priceInput, '100')

    await waitFor(() => {
      const btn = screen.getByText('생성').closest('button')
      expect(btn).not.toBeDisabled()
    })

    await user.click(screen.getByText('생성'))

    await waitFor(() => {
      expect(screen.getByText(/폼 데이터 변환 중 오류가 발생했습니다/)).toBeInTheDocument()
    })
  })

  test('required 함수가 children에 전달된다', () => {
    const childrenSpy = vi.fn().mockReturnValue(null)

    render(
      <TestWrapper>
        <EntityCreateForm<TestEntity, TestCreateFormData>
          schema={TestCreateSchema}
          codec={TestCreateCodec}
          onSubmit={vi.fn()}
          hasRole
        >
          {childrenSpy}
        </EntityCreateForm>
      </TestWrapper>,
    )

    expect(childrenSpy).toHaveBeenCalled()
    const [, required] = childrenSpy.mock.calls[0]
    expect(typeof required).toBe('function')
    expect(required('name')).toBe(true) // string().min(1)이므로 required
    expect(required('price')).toBe(true) // coerce.number()는 optional이 아니므로 required
  })
})
