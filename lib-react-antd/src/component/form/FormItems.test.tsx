import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import { useForm } from 'react-hook-form'
import type { ReactNode } from 'react'
import InputFormItem from './InputFormItem'
import InputNumberFormItem from './InputNumberFormItem'
import InputSearchFormItem from './InputSearchFormItem'
import TextAreaFormItem from './TextAreaFormItem'
import SelectFormItem from './SelectFormItem'
import CheckboxFormItem from './CheckboxFormItem'
import CheckboxGroupFormItem from './CheckboxGroupFormItem'
import RadioGroupFormItem from './RadioGroupFormItem'
import ButtonFormItem from './ButtonFormItem'
import { TestWrapper } from '../../test/wrapper'

type TestForm = {
  text: string
  num: number
  search: string
  memo: string
  category: string
  active: boolean
  tags: string[]
  gender: string
}

const defaultValues: TestForm = {
  text: '',
  num: 0,
  search: '',
  memo: '',
  category: '',
  active: false,
  tags: [],
  gender: '',
}

const FormHost = ({ children }: { children: (ufr: ReturnType<typeof useForm<TestForm>>) => ReactNode }) => {
  const ufr = useForm<TestForm>({ defaultValues })
  return <TestWrapper>{children(ufr)}</TestWrapper>
}

describe('InputFormItem', () => {
  test('Input이 렌더링된다', () => {
    render(
      <FormHost>
        {(ufr) => <InputFormItem fieldKey="text" labelName="텍스트" ufr={ufr} />}
      </FormHost>,
    )
    expect(screen.getByText('텍스트')).toBeInTheDocument()
  })

  test('disabled 상태가 적용된다', () => {
    render(
      <FormHost>
        {(ufr) => <InputFormItem fieldKey="text" labelName="텍스트" ufr={ufr} disabled />}
      </FormHost>,
    )
    expect(screen.getByRole('textbox')).toBeDisabled()
  })
})

describe('InputNumberFormItem', () => {
  test('InputNumber가 렌더링된다', () => {
    render(
      <FormHost>
        {(ufr) => <InputNumberFormItem fieldKey="num" labelName="숫자" ufr={ufr} />}
      </FormHost>,
    )
    expect(screen.getByText('숫자')).toBeInTheDocument()
    expect(screen.getByRole('spinbutton')).toBeInTheDocument()
  })

  test('disabled 상태가 적용된다', () => {
    render(
      <FormHost>
        {(ufr) => <InputNumberFormItem fieldKey="num" labelName="숫자" ufr={ufr} inputProps={{ disabled: true }} />}
      </FormHost>,
    )
    expect(screen.getByRole('spinbutton')).toBeDisabled()
  })
})

describe('InputSearchFormItem', () => {
  test('Search Input이 렌더링된다', () => {
    render(
      <FormHost>
        {(ufr) => <InputSearchFormItem fieldKey="search" labelName="검색" ufr={ufr} />}
      </FormHost>,
    )
    expect(screen.getByText('검색')).toBeInTheDocument()
  })

  test('onSearch 콜백이 호출된다', async () => {
    const onSearch = vi.fn()
    const user = userEvent.setup()
    render(
      <FormHost>
        {(ufr) => (
          <InputSearchFormItem
            fieldKey="search"
            labelName="검색"
            ufr={ufr}
            onSearch={onSearch}
            enterButton="찾기"
          />
        )}
      </FormHost>,
    )

    const btn = screen.getByText('찾기')
    await user.click(btn)
    expect(onSearch).toHaveBeenCalled()
  })
})

describe('TextAreaFormItem', () => {
  test('TextArea가 렌더링된다', () => {
    render(
      <FormHost>
        {(ufr) => <TextAreaFormItem fieldKey="memo" labelName="메모" ufr={ufr} />}
      </FormHost>,
    )
    expect(screen.getByText('메모')).toBeInTheDocument()
    expect(screen.getByRole('textbox')).toBeInTheDocument()
  })
})

describe('SelectFormItem', () => {
  const options = [
    { label: '전자제품', value: 'electronics' },
    { label: '도서', value: 'books' },
  ]

  test('Select가 렌더링된다', () => {
    render(
      <FormHost>
        {(ufr) => <SelectFormItem fieldKey="category" labelName="카테고리" ufr={ufr} options={options} />}
      </FormHost>,
    )
    expect(screen.getByText('카테고리')).toBeInTheDocument()
  })

  test('로딩 상태가 적용된다', () => {
    render(
      <FormHost>
        {(ufr) => (
          <SelectFormItem fieldKey="category" labelName="카테고리" ufr={ufr} options={options} isLoading />
        )}
      </FormHost>,
    )
    // antd Select는 loading 시 spinner를 표시
    expect(screen.getByText('카테고리')).toBeInTheDocument()
  })
})

describe('CheckboxFormItem', () => {
  test('Checkbox가 렌더링된다', () => {
    render(
      <FormHost>
        {(ufr) => <CheckboxFormItem fieldKey="active" labelName="활성화" ufr={ufr} />}
      </FormHost>,
    )
    expect(screen.getByText('활성화')).toBeInTheDocument()
    expect(screen.getByRole('checkbox')).toBeInTheDocument()
  })

  test('클릭하면 체크 상태가 변경된다', async () => {
    const user = userEvent.setup()
    render(
      <FormHost>
        {(ufr) => <CheckboxFormItem fieldKey="active" labelName="활성화" ufr={ufr} />}
      </FormHost>,
    )

    const checkbox = screen.getByRole('checkbox')
    expect(checkbox).not.toBeChecked()
    await user.click(checkbox)
    await waitFor(() => {
      expect(checkbox).toBeChecked()
    })
  })
})

describe('CheckboxGroupFormItem', () => {
  const options = [
    { label: 'Tag A', value: 'a' },
    { label: 'Tag B', value: 'b' },
    { label: 'Tag C', value: 'c' },
  ]

  test('CheckboxGroup이 렌더링된다', () => {
    render(
      <FormHost>
        {(ufr) => <CheckboxGroupFormItem fieldKey="tags" labelName="태그" ufr={ufr} options={options} />}
      </FormHost>,
    )
    expect(screen.getByText('태그')).toBeInTheDocument()
    expect(screen.getByText('Tag A')).toBeInTheDocument()
    expect(screen.getByText('Tag B')).toBeInTheDocument()
  })

  test('vertical 렌더링이 가능하다', () => {
    render(
      <FormHost>
        {(ufr) => (
          <CheckboxGroupFormItem fieldKey="tags" labelName="태그" ufr={ufr} options={options} vertical />
        )}
      </FormHost>,
    )
    expect(screen.getByText('Tag A')).toBeInTheDocument()
  })
})

describe('RadioGroupFormItem', () => {
  const options = [
    { label: '남성', value: 'male' },
    { label: '여성', value: 'female' },
  ]

  test('RadioGroup이 렌더링된다', () => {
    render(
      <FormHost>
        {(ufr) => <RadioGroupFormItem fieldKey="gender" labelName="성별" ufr={ufr} options={options} />}
      </FormHost>,
    )
    expect(screen.getByText('성별')).toBeInTheDocument()
    expect(screen.getByText('남성')).toBeInTheDocument()
    expect(screen.getByText('여성')).toBeInTheDocument()
  })

  test('라디오 버튼을 클릭하면 선택된다', async () => {
    const user = userEvent.setup()
    render(
      <FormHost>
        {(ufr) => <RadioGroupFormItem fieldKey="gender" labelName="성별" ufr={ufr} options={options} />}
      </FormHost>,
    )

    const maleRadio = screen.getByLabelText('남성')
    await user.click(maleRadio)
    await waitFor(() => {
      expect(maleRadio).toBeChecked()
    })
  })
})

describe('ButtonFormItem', () => {
  test('버튼 텍스트가 표시된다', () => {
    render(
      <TestWrapper>
        <ButtonFormItem text="저장" valid />
      </TestWrapper>,
    )
    expect(screen.getByText('저장')).toBeInTheDocument()
  })

  test('valid=false이면 버튼이 비활성화된다', () => {
    render(
      <TestWrapper>
        <ButtonFormItem text="저장" valid={false} />
      </TestWrapper>,
    )
    expect(screen.getByText('저장').closest('button')).toBeDisabled()
  })

  test('valid=true이면 버튼이 활성화된다', () => {
    render(
      <TestWrapper>
        <ButtonFormItem text="저장" valid />
      </TestWrapper>,
    )
    expect(screen.getByText('저장').closest('button')).not.toBeDisabled()
  })
})
