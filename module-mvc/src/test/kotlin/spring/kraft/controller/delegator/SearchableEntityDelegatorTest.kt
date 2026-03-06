package spring.kraft.controller.delegator

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import spring.kraft.controller.delegator.fixture.TestBaseEntityMapper
import spring.kraft.service.SearchableEntityService
import spring.kraft.service.fixture.ServiceCreateForm
import spring.kraft.service.fixture.ServiceUpdateForm
import spring.kraft.service.fixture.TestServiceEntity

class SearchableEntityDelegatorTest {
    private interface TestSearchableRepo :
        JpaRepository<TestServiceEntity, Long>,
        JpaSpecificationExecutor<TestServiceEntity>

    private interface TestSearchableService :
        SearchableEntityService<Long, TestServiceEntity, TestSearchableRepo, ServiceCreateForm, ServiceUpdateForm>

    private val mockService: TestSearchableService = mock()
    private val mockMapper: TestBaseEntityMapper = mock()
    private val delegator =
        SearchableEntityDelegator<
            Long,
            TestServiceEntity,
            TestSearchableRepo,
            TestSearchableService,
            String,
            ServiceCreateForm,
            ServiceUpdateForm,
        >(mockService, mockMapper)

    @Test
    fun `search - params로 service search에 위임`() {
        val pageable = PageRequest.of(0, 10)
        val params = mapOf("name" to listOf("test"))
        val mappedPage = PageImpl(listOf("dto-test"), pageable, 1)
        whenever(
            mockService.search(eq(params), eq(pageable), any<(TestServiceEntity) -> String>()),
        ).thenReturn(mappedPage)

        val result = delegator.search(pageable, params)

        assertEquals(1, result.totalElements)
        assertEquals("dto-test", result.content[0])
    }

    @Test
    fun `search - 빈 params는 전체 조회`() {
        val pageable = PageRequest.of(0, 10)
        val params = emptyMap<String, List<String>>()
        val mappedPage = PageImpl(listOf("dto-test"), pageable, 1)
        whenever(
            mockService.search(eq(params), eq(pageable), any<(TestServiceEntity) -> String>()),
        ).thenReturn(mappedPage)

        val result = delegator.search(pageable, params)

        assertEquals(1, result.totalElements)
        assertEquals("dto-test", result.content[0])
    }

    @Test
    fun `search - transformer 오버로드는 service search에 위임`() {
        val pageable = PageRequest.of(0, 10)
        val params = mapOf("name" to listOf("test"))
        val transformer: (TestServiceEntity) -> Int = { it.name.length }
        val page = PageImpl(listOf(4), pageable, 1)
        whenever(mockService.search(params, pageable, transformer)).thenReturn(page)

        val result = delegator.search(pageable, params, transformer)

        assertEquals(4, result.content[0])
        verify(mockService).search(params, pageable, transformer)
    }
}
