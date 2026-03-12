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
import org.springframework.data.history.Revision
import org.springframework.data.history.Revisions
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.repository.history.RevisionRepository
import spring.kraft.controller.delegator.fixture.TestRevisionEntityMapper
import spring.kraft.service.RevisionEntityService
import spring.kraft.service.fixture.ServiceCreateForm
import spring.kraft.service.fixture.ServiceUpdateForm
import spring.kraft.service.fixture.TestServiceEntity

class RevisionEntityDelegatorTest {
    private interface TestRevisionRepo :
        JpaRepository<TestServiceEntity, Long>,
        RevisionRepository<TestServiceEntity, Long, Int>

    private interface TestRevisionService :
        RevisionEntityService<Long, TestServiceEntity, TestRevisionRepo, ServiceCreateForm, ServiceUpdateForm>

    private val mockService: TestRevisionService = mock()
    private val mockMapper: TestRevisionEntityMapper = mock()
    private val delegator =
        RevisionEntityDelegator<
            Long,
            TestServiceEntity,
            TestRevisionRepo,
            TestRevisionService,
            String,
            ServiceCreateForm,
            ServiceUpdateForm,
        >(mockService, mockMapper)

    @Test
    fun `revisions - mapper toRevisionDto 적용하여 Revisions 반환`() {
        val mappedRevisions: Revisions<Int, String> = Revisions.of(listOf())
        whenever(
            mockService.findRevisions(eq(1L), any<(TestServiceEntity) -> String>()),
        ).thenReturn(mappedRevisions)

        val result = delegator.revisions(1L)

        assertEquals(0, result.content.size)
    }

    @Test
    fun `revisions - transformer 오버로드는 service findRevisions에 위임`() {
        val transformer: (TestServiceEntity) -> Int = { it.name.length }
        val revisions: Revisions<Int, Int> = Revisions.of(listOf())
        whenever(mockService.findRevisions(1L, transformer)).thenReturn(revisions)

        val result = delegator.revisions(1L, transformer)

        assertEquals(0, result.content.size)
        verify(mockService).findRevisions(1L, transformer)
    }

    @Test
    fun `revisionPages - mapper toRevisionDto 적용하여 Page 반환`() {
        val pageable = PageRequest.of(0, 10)
        val mappedPage: PageImpl<Revision<Int, String>> = PageImpl(listOf(), pageable, 0)
        whenever(
            mockService.findRevisionPages(eq(1L), eq(pageable), any<(TestServiceEntity) -> String>()),
        ).thenReturn(mappedPage)

        val result = delegator.revisionPages(1L, pageable)

        assertEquals(0, result.totalElements)
    }

    @Test
    fun `revisionPages - transformer 오버로드는 service findRevisionPages에 위임`() {
        val pageable = PageRequest.of(0, 10)
        val transformer: (TestServiceEntity) -> Int = { it.name.length }
        val page: PageImpl<Revision<Int, Int>> = PageImpl(listOf(), pageable, 0)
        whenever(mockService.findRevisionPages(1L, pageable, transformer)).thenReturn(page)

        val result = delegator.revisionPages(1L, pageable, transformer)

        assertEquals(0, result.totalElements)
        verify(mockService).findRevisionPages(1L, pageable, transformer)
    }
}
