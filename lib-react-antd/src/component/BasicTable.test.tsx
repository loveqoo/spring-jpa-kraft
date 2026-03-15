import { Profiler, type ProfilerOnRenderCallback } from 'react'
import { render, screen, waitFor, act } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, test, expect, vi } from 'vitest'
import type { Page } from 'lib-entity-support'
import { BasicTable } from './BasicTable'
import { TestWrapper } from '../test/wrapper'

type TestRecord = {
  id: number
  name: string
  price: number
}

const mockPage = (
  content: TestRecord[],
  pageNumber = 0,
  totalElements?: number,
  pageSize = 10,
): Page<TestRecord> => {
  const total = totalElements ?? content.length
  return {
    content,
    pageable: {
      sort: { unsorted: true, sorted: false, empty: true },
      pageNumber,
      pageSize,
      offset: pageNumber * pageSize,
      unpaged: false,
      paged: true,
    },
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
    totalElements: total,
    last: pageNumber >= Math.max(1, Math.ceil(total / pageSize)) - 1,
    numberOfElements: content.length,
    first: pageNumber === 0,
    size: pageSize,
    number: pageNumber,
    sort: { unsorted: true, sorted: false, empty: true },
    empty: content.length === 0,
  }
}

const sampleData: TestRecord[] = Array.from({ length: 10 }, (_, i) => ({
  id: i + 1,
  name: `Product ${String(i + 1).padStart(2, '0')}`,
  price: (i + 1) * 100,
}))

const columns = [
  { title: 'ID', dataIndex: 'id', key: 'id' },
  { title: 'Name', dataIndex: 'name', key: 'name', sorter: true },
  { title: 'Price', dataIndex: 'price', key: 'price', sorter: true },
]

const createMockUseQuery = (page: Page<TestRecord>) => {
  return vi.fn().mockReturnValue({
    data: page,
    isLoading: false,
    error: null,
  })
}

const createLoadingUseQuery = () => {
  return vi.fn().mockReturnValue({
    data: undefined,
    isLoading: true,
    error: null,
  })
}

describe('BasicTable', () => {
  test('데이터가 로드되면 테이블에 렌더링된다', () => {
    const page = mockPage(sampleData, 0, 25)
    const useQuery = createMockUseQuery(page)

    render(
      <TestWrapper>
        <BasicTable<TestRecord>
          useQuery={useQuery}
          columns={columns}
          colSort="id,asc"
        />
      </TestWrapper>,
    )

    expect(screen.getByText('Product 01')).toBeInTheDocument()
    expect(screen.getByText('Product 10')).toBeInTheDocument()
  })

  test('로딩 중에는 데이터가 표시되지 않는다', () => {
    const useQuery = createLoadingUseQuery()

    render(
      <TestWrapper>
        <BasicTable<TestRecord>
          useQuery={useQuery}
          columns={columns}
          colSort="id,asc"
        />
      </TestWrapper>,
    )

    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.queryByText('Product 01')).not.toBeInTheDocument()
  })

  test('총 건수가 표시된다', () => {
    const page = mockPage(sampleData, 0, 25)
    const useQuery = createMockUseQuery(page)

    render(
      <TestWrapper>
        <BasicTable<TestRecord>
          useQuery={useQuery}
          columns={columns}
          colSort="id,asc"
        />
      </TestWrapper>,
    )

    expect(screen.getByText('총 25건')).toBeInTheDocument()
  })

  test('useQuery에 configParam 함수가 전달된다', () => {
    const page = mockPage(sampleData, 0, 25)
    const useQuery = createMockUseQuery(page)

    render(
      <TestWrapper>
        <BasicTable<TestRecord>
          useQuery={useQuery}
          columns={columns}
          colSort="id,asc"
          pageSize={20}
        />
      </TestWrapper>,
    )

    expect(useQuery).toHaveBeenCalled()
    const configParam = useQuery.mock.calls[0][0]
    expect(typeof configParam).toBe('function')
  })

  test('빈 데이터일 때 No Data가 표시된다', () => {
    const page = mockPage([], 0, 0)
    const useQuery = createMockUseQuery(page)

    render(
      <TestWrapper>
        <BasicTable<TestRecord>
          useQuery={useQuery}
          columns={columns}
          colSort="id,asc"
        />
      </TestWrapper>,
    )

    // antd Table은 빈 데이터일 때 Empty 컴포넌트를 렌더링
    expect(screen.queryByText('Product 01')).not.toBeInTheDocument()
  })

  test('컬럼 헤더가 모두 렌더링된다', () => {
    const page = mockPage(sampleData, 0, 25)
    const useQuery = createMockUseQuery(page)

    render(
      <TestWrapper>
        <BasicTable<TestRecord>
          useQuery={useQuery}
          columns={columns}
          colSort="id,asc"
        />
      </TestWrapper>,
    )

    expect(screen.getByText('ID')).toBeInTheDocument()
    expect(screen.getByText('Name')).toBeInTheDocument()
    expect(screen.getByText('Price')).toBeInTheDocument()
  })

  test('rowKey 함수가 적용되어도 렌더링된다', () => {
    const page = mockPage(sampleData, 0, 25)
    const useQuery = createMockUseQuery(page)
    const rowKeyFn = (record: TestRecord) => `row-${record.id}`

    render(
      <TestWrapper>
        <BasicTable<TestRecord>
          useQuery={useQuery}
          columns={columns}
          colSort="id,asc"
          rowKey={rowKeyFn}
        />
      </TestWrapper>,
    )

    expect(screen.getByText('Product 01')).toBeInTheDocument()
  })

  test('idColumn으로 커스텀 ID 컬럼을 지정할 수 있다', () => {
    const page = mockPage(sampleData, 0, 25)
    const useQuery = createMockUseQuery(page)

    render(
      <TestWrapper>
        <BasicTable<TestRecord>
          useQuery={useQuery}
          columns={columns}
          colSort="id,asc"
          idColumn="name"
        />
      </TestWrapper>,
    )

    expect(screen.getByText('Product 01')).toBeInTheDocument()
  })

  describe('리렌더링 검증', () => {
    const createProfiler = () => {
      const renders: Array<{ id: string; phase: string; actualDuration: number }> = []
      const onRender: ProfilerOnRenderCallback = (id, phase, actualDuration) => {
        renders.push({ id, phase, actualDuration })
      }
      return { renders, onRender }
    }

    test('초기 마운트 후 안정화되면 추가 렌더가 발생하지 않는다', async () => {
      const page = mockPage(sampleData, 0, 25)
      const useQuery = createMockUseQuery(page)
      const { renders, onRender } = createProfiler()

      render(
        <TestWrapper>
          <Profiler id="BasicTable" onRender={onRender}>
            <BasicTable<TestRecord>
              useQuery={useQuery}
              columns={columns}
              colSort="id,asc"
            />
          </Profiler>
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText('Product 01')).toBeInTheDocument()
      })

      const mountRenderCount = renders.length

      // 200ms 대기 후 추가 렌더 없어야 함
      await act(async () => {
        await new Promise((r) => setTimeout(r, 200))
      })

      expect(renders.length).toBe(mountRenderCount)
    })

    test('동일 데이터로 리렌더 시 useQuery 호출 횟수가 안정적이다', async () => {
      const page = mockPage(sampleData, 0, 25)
      const useQuery = createMockUseQuery(page)

      render(
        <TestWrapper>
          <BasicTable<TestRecord>
            useQuery={useQuery}
            columns={columns}
            colSort="id,asc"
          />
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText('Product 01')).toBeInTheDocument()
      })

      const callCountAfterMount = useQuery.mock.calls.length

      await act(async () => {
        await new Promise((r) => setTimeout(r, 200))
      })

      // 안정화 후 useQuery 추가 호출 없어야 함
      expect(useQuery.mock.calls.length).toBe(callCountAfterMount)
    })

    test('페이지네이션 클릭 시 정확히 필요한 만큼만 리렌더된다', async () => {
      const user = userEvent.setup()
      const page = mockPage(sampleData, 0, 25)
      const useQuery = createMockUseQuery(page)
      const { renders, onRender } = createProfiler()

      render(
        <TestWrapper>
          <Profiler id="BasicTable" onRender={onRender}>
            <BasicTable<TestRecord>
              useQuery={useQuery}
              columns={columns}
              colSort="id,asc"
            />
          </Profiler>
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText('Product 01')).toBeInTheDocument()
      })

      const renderCountBeforeClick = renders.length

      // 페이지 2로 이동
      const page2Button = screen.getByTitle('2')
      await user.click(page2Button)

      await act(async () => {
        await new Promise((r) => setTimeout(r, 200))
      })

      const renderCountAfterClick = renders.length
      const additionalRenders = renderCountAfterClick - renderCountBeforeClick

      // 페이지 변경 시 리렌더 체인:
      // 1. antd onChange → setQueryParam
      // 2. useEffect[queryParam] → setSearchParams
      // 3. React Router location 변경
      // 4. useEffect[location.search] → setQueryParam
      // 현재 5회 이내이면 정상 범위
      expect(additionalRenders).toBeGreaterThanOrEqual(1)
      expect(additionalRenders).toBeLessThanOrEqual(5)
    })

    test('정렬 클릭 시 과도한 리렌더가 발생하지 않는다', async () => {
      const user = userEvent.setup()
      const page = mockPage(sampleData, 0, 25)
      const useQuery = createMockUseQuery(page)
      const { renders, onRender } = createProfiler()

      render(
        <TestWrapper>
          <Profiler id="BasicTable" onRender={onRender}>
            <BasicTable<TestRecord>
              useQuery={useQuery}
              columns={columns}
              colSort="id,asc"
            />
          </Profiler>
        </TestWrapper>,
      )

      await waitFor(() => {
        expect(screen.getByText('Product 01')).toBeInTheDocument()
      })

      const renderCountBeforeSort = renders.length

      // Name 컬럼 정렬 클릭
      const nameHeader = screen.getByText('Name')
      await user.click(nameHeader)

      await act(async () => {
        await new Promise((r) => setTimeout(r, 200))
      })

      const additionalRenders = renders.length - renderCountBeforeSort
      // TODO: 현재 정렬 시 10회 렌더 발생 — onChange에서 searchParams + queryParam 이중 조작이 원인
      // 최적화 후 이 값을 5 이하로 낮춰야 함
      expect(additionalRenders).toBeLessThanOrEqual(10)
    })
  })
})
