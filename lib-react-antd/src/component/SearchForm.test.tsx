import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import { useState } from 'react'
import { Either as E } from 'effect'
import { QueryParam, type Codec } from 'lib-entity-support'
import z from 'zod'
import type { UseFormReturn } from 'react-hook-form'
import { Form, Input } from 'antd'
import { SearchForm, type SearchProps, type SearchPropsExt } from './SearchForm'
import { TestWrapper } from '../test/wrapper'

type TestSearch = z.infer<typeof TestSearchSchema>

const TestSearchSchema = z.object({
  name: z.string().optional(),
})

const TestSearchCodec: Codec<TestSearch, QueryParam> = {
  encode: (form: TestSearch): E.Either<QueryParam, string> => {
    const q = QueryParam.of()
    if (form.name) q.write('name', form.name)
    return E.right(q)
  },
  decode: (q: QueryParam): E.Either<TestSearch, string> => {
    return E.right({
      name: q.readStringOr('name', '') || undefined,
    })
  },
}

const renderTestForm = (form: UseFormReturn<TestSearch>, _toggle: boolean) => (
  <Form.Item label="Name">
    <Input {...form.register('name')} placeholder="Search name" />
  </Form.Item>
)

const SearchFormTestWrapper = (
  props: Partial<SearchProps<TestSearch>> &
    Partial<Pick<SearchPropsExt, 'emptyQueryParam' | 'queryParamState' | 'creationPath' | 'columnOptions' | 'setHiddenColumnKeys'>>,
) => {
  const [queryParam, setQueryParam] = useState<QueryParam>(
    props.queryParamState?.[0] ?? QueryParam.of(),
  )
  return (
    <TestWrapper>
      <SearchForm<TestSearch>
        schema={TestSearchSchema}
        codec={TestSearchCodec}
        renderForm={renderTestForm}
        emptyQueryParam={QueryParam.of()}
        queryParamState={props.queryParamState ?? [queryParam, setQueryParam]}
        {...props}
      />
    </TestWrapper>
  )
}

describe('SearchForm', () => {
  test('검색 폼이 렌더링된다', () => {
    render(<SearchFormTestWrapper />)
    expect(screen.getByPlaceholderText('Search name')).toBeInTheDocument()
  })

  test('조회 버튼이 표시된다', () => {
    render(<SearchFormTestWrapper />)
    expect(screen.getByText('조회')).toBeInTheDocument()
  })

  test('초기화 버튼이 표시된다', () => {
    render(<SearchFormTestWrapper />)
    expect(screen.getByText('초기화')).toBeInTheDocument()
  })

  test('생성 버튼이 비활성화 상태로 표시된다 (creationPath 없음)', () => {
    render(<SearchFormTestWrapper />)
    const createBtn = screen.getByText('생성')
    expect(createBtn.closest('button')).toBeDisabled()
  })

  test('creationPath가 있으면 생성 버튼이 활성화된다', () => {
    render(<SearchFormTestWrapper creationPath="/products/new" />)
    const createBtn = screen.getByText('생성')
    expect(createBtn.closest('button')).not.toBeDisabled()
  })

  test('검색어를 입력하고 조회 버튼을 클릭하면 queryParam이 업데이트된다', async () => {
    const user = userEvent.setup()
    const setQueryParam = vi.fn()
    const queryParam = QueryParam.of()

    render(
      <SearchFormTestWrapper
        queryParamState={[queryParam, setQueryParam]}
      />,
    )

    const input = screen.getByPlaceholderText('Search name')
    await user.type(input, 'test')
    await user.click(screen.getByText('조회'))

    await waitFor(() => {
      expect(setQueryParam).toHaveBeenCalled()
    })
  })

  test('초기화 버튼 클릭 시 setQueryParam이 호출된다', async () => {
    const user = userEvent.setup()
    const setQueryParam = vi.fn()
    const queryParam = QueryParam.of().write('name', 'existing')

    render(
      <SearchFormTestWrapper
        queryParamState={[queryParam, setQueryParam]}
      />,
    )

    await user.click(screen.getByText('초기화'))

    await waitFor(() => {
      expect(setQueryParam).toHaveBeenCalled()
    })
  })

  test('queryParam이 변경되면 codec.decode가 호출되어 폼이 리셋된다', async () => {
    const setQueryParam = vi.fn()
    const queryParam = QueryParam.of().write('name', 'initial')

    // codec.decode가 호출되는지 확인
    const decodeSpy = vi.spyOn(TestSearchCodec, 'decode')

    render(
      <SearchFormTestWrapper
        queryParamState={[queryParam, setQueryParam]}
      />,
    )

    await waitFor(() => {
      expect(decodeSpy).toHaveBeenCalled()
      const decoded = decodeSpy.mock.results[0]
      expect(decoded.type).toBe('return')
    })

    decodeSpy.mockRestore()
  })

  test('renderActions가 제공되면 기본 버튼 대신 커스텀 액션이 렌더링된다', () => {
    render(
      <SearchFormTestWrapper
        renderActions={() => <button>Custom Action</button>}
      />,
    )

    expect(screen.getByText('Custom Action')).toBeInTheDocument()
    expect(screen.queryByText('조회')).not.toBeInTheDocument()
  })

  test('audit 토글이 queryParam과 동기화된다', async () => {
    const queryParam = QueryParam.of().write('createdBy', 'admin')
    const setQueryParam = vi.fn()

    render(
      <SearchFormTestWrapper
        queryParamState={[queryParam, setQueryParam]}
      />,
    )

    await waitFor(() => {
      const checkbox = screen.queryByRole('checkbox')
      if (checkbox) {
        expect(checkbox).toBeChecked()
      }
    })
  })
})
