package spring.kraft.controller.delegator

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.history.Revisions
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.repository.history.RevisionRepository
import spring.kraft.controller.delegator.fixture.TestRevisionEntityMapper
import spring.kraft.service.SearchableRevisionEntityService
import spring.kraft.service.fixture.ServiceCreateForm
import spring.kraft.service.fixture.ServiceUpdateForm
import spring.kraft.service.fixture.TestServiceEntity

class SearchableRevisionEntityDelegatorTest {
    private interface TestFullRepo :
        JpaRepository<TestServiceEntity, Long>,
        JpaSpecificationExecutor<TestServiceEntity>,
        RevisionRepository<TestServiceEntity, Long, Int>

    private interface TestFullService :
        SearchableRevisionEntityService<Long, TestServiceEntity, TestFullRepo, ServiceCreateForm, ServiceUpdateForm>

    private val mockService: TestFullService = mock()
    private val mockMapper: TestRevisionEntityMapper = mock()
    private val delegator =
        SearchableRevisionEntityDelegator<
            Long,
            TestServiceEntity,
            TestFullRepo,
            TestFullService,
            String,
            ServiceCreateForm,
            ServiceUpdateForm,
        >(mockService, mockMapper)

    @Test
    fun `search - params 기반 검색 동작`() {
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
    fun `revisions - revision 조회 동작`() {
        val mappedRevisions: Revisions<Int, String> = Revisions.of(listOf())
        whenever(
            mockService.findRevisions(eq(1L), any<(TestServiceEntity) -> String>()),
        ).thenReturn(mappedRevisions)

        val result = delegator.revisions(1L)

        assertEquals(0, result.content.size)
    }
}
