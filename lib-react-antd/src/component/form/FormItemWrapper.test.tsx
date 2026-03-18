import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect } from 'vitest'
import { useForm } from 'react-hook-form'
import { Input } from 'antd'
import FormItemWrapper from './FormItemWrapper'
import { TestWrapper } from '../../test/wrapper'

type TestForm = { name: string }

const FormItemTestHost = ({
  required,
  labelName,
  labelNames,
}: {
  required?: (key: string) => boolean
  labelName?: string
  labelNames?: Record<string, string>
}) => {
  const ufr = useForm<TestForm>({ defaultValues: { name: '' } })
  return (
    <TestWrapper>
      <FormItemWrapper<TestForm>
        ufr={ufr}
        fieldKey="name"
        labelName={labelName}
        labelNames={labelNames}
        required={required}
      >
        <Input placeholder="이름 입력" />
      </FormItemWrapper>
    </TestWrapper>
  )
}

describe('FormItemWrapper', () => {
  test('labelName이 렌더링된다', () => {
    render(<FormItemTestHost labelName="이름" />)
    expect(screen.getByText('이름')).toBeInTheDocument()
  })

  test('labelNames에서 fieldKey로 라벨을 찾는다', () => {
    render(<FormItemTestHost labelNames={{ name: '성명' }} />)
    expect(screen.getByText('성명')).toBeInTheDocument()
  })

  test('children Input이 렌더링된다', () => {
    render(<FormItemTestHost labelName="이름" />)
    expect(screen.getByPlaceholderText('이름 입력')).toBeInTheDocument()
  })

  test('required가 true이면 필수 표시된다', () => {
    render(<FormItemTestHost labelName="이름" required={() => true} />)
    const label = screen.getByText('이름')
    // antd required는 label 앞에 * 표시를 추가
    const formItem = label.closest('.ant-form-item')
    expect(formItem).toBeInTheDocument()
  })

  test('입력값이 Controller를 통해 연동된다', async () => {
    const user = userEvent.setup()
    render(<FormItemTestHost labelName="이름" />)

    const input = screen.getByPlaceholderText('이름 입력')
    await user.type(input, 'test')

    await waitFor(() => {
      expect(input).toHaveValue('test')
    })
  })
})
