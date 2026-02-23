package spring.kraft.controller.delegator

import com.querydsl.core.types.Predicate
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
import org.springframework.data.querydsl.QuerydslPredicateExecutor
import spring.kraft.controller.delegator.fixture.TestBaseEntityMapper
import spring.kraft.jpa.repo.DynamicSearchRepository
import spring.kraft.service.SearchableEntityService
import spring.kraft.service.fixture.ServiceCreateForm
import spring.kraft.service.fixture.ServiceUpdateForm
import spring.kraft.service.fixture.TestServiceEntity

class SearchableEntityDelegatorTest {
    private interface TestSearchableRepo :
        JpaRepository<TestServiceEntity, Long>,
        QuerydslPredicateExecutor<TestServiceEntity>,
        DynamicSearchRepository<Long, TestServiceEntity>

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
    fun `search - predicate가 있으면 service search에 위임`() {
        val pageable = PageRequest.of(0, 10)
        val predicate: Predicate = mock()
        val mappedPage = PageImpl(listOf("dto-test"), pageable, 1)
        whenever(
            mockService.search(eq(predicate), eq(pageable), any<(TestServiceEntity) -> String>()),
        ).thenReturn(mappedPage)

        val result = delegator.search(pageable, predicate)

        assertEquals(1, result.totalElements)
        assertEquals("dto-test", result.content[0])
    }

    @Test
    fun `search - predicate가 null이면 findAll로 fallback`() {
        val pageable = PageRequest.of(0, 10)
        val mappedPage = PageImpl(listOf("dto-test"), pageable, 1)
        whenever(mockService.findAll(eq(pageable), any<(TestServiceEntity) -> String>())).thenReturn(mappedPage)

        val result = delegator.search(pageable, null)

        assertEquals(1, result.totalElements)
        assertEquals("dto-test", result.content[0])
    }

    @Test
    fun `search - customParams로 service searchCustom에 위임`() {
        val pageable = PageRequest.of(0, 10)
        val params = mapOf("name" to "test")
        val mappedPage = PageImpl(listOf("dto-test"), pageable, 1)
        whenever(
            mockService.searchCustom(eq(params), eq(pageable), any<(TestServiceEntity) -> String>()),
        ).thenReturn(mappedPage)

        val result = delegator.search(pageable, params)

        assertEquals("dto-test", result.content[0])
    }

    @Test
    fun `search - customParams transformer 오버로드는 service searchCustom에 위임`() {
        val pageable = PageRequest.of(0, 10)
        val params = mapOf("name" to "test")
        val transformer: (TestServiceEntity) -> Int = { it.name.length }
        val page = PageImpl(listOf(4), pageable, 1)
        whenever(mockService.searchCustom(params, pageable, transformer)).thenReturn(page)

        val result = delegator.search(pageable, params, transformer)

        assertEquals(4, result.content[0])
        verify(mockService).searchCustom(params, pageable, transformer)
    }
}
