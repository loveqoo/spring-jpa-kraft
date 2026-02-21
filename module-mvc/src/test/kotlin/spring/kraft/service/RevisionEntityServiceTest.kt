package spring.kraft.service

import jakarta.validation.Validator
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.history.Revision
import org.springframework.data.history.RevisionMetadata
import org.springframework.data.history.Revisions
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.repository.history.RevisionRepository
import spring.kraft.form.FormResolver
import spring.kraft.form.FormResolver0
import spring.kraft.service.fixture.ServiceCreateForm
import spring.kraft.service.fixture.ServiceUpdateForm
import spring.kraft.service.fixture.TestServiceEntity

private interface TestRevisionRepo :
    JpaRepository<TestServiceEntity, Long>,
    RevisionRepository<TestServiceEntity, Long, Int>

class RevisionEntityServiceTest {
    private val mockRepo: TestRevisionRepo = mock()
    private val mockValidator: Validator = mock()

    private val resolver =
        object : FormResolver0<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm>() {
            override val repo: JpaRepository<TestServiceEntity, Long> = mockRepo
            override val validator: Validator = mockValidator

            override fun ServiceCreateForm.createEntity(): Result<TestServiceEntity> = Result.success(TestServiceEntity(name = this.name))

            override fun ServiceUpdateForm.modify(entity: TestServiceEntity): Result<Unit> = Result.success(Unit)
        }

    private val service =
        object : RevisionEntityService<Long, TestServiceEntity, TestRevisionRepo, ServiceCreateForm, ServiceUpdateForm> {
            override val repo: TestRevisionRepo = mockRepo
            override val tableName: String = "test_entity"
            override val formResolver:
                FormResolver<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm> = resolver
        }

    @BeforeEach
    fun setUp() {
        whenever(mockValidator.validate(any<Any>())).thenReturn(emptySet())
    }

    @Test
    fun `findRevisions - 리비전 목록 반환`() {
        val entity = TestServiceEntity(id = 1L, name = "test")
        val metadata: RevisionMetadata<Int> = mock()
        val revision = Revision.of(metadata, entity)
        whenever(mockRepo.findRevisions(1L)).thenReturn(Revisions.of(listOf(revision)))

        val result = service.findRevisions(1L)

        assertEquals(1, result.content.size)
        assertEquals("test", result.content[0].entity.name)
    }

    @Test
    fun `findRevisions - 변환 함수 적용`() {
        val entity = TestServiceEntity(id = 1L, name = "test")
        val metadata: RevisionMetadata<Int> = mock()
        val revision = Revision.of(metadata, entity)
        whenever(mockRepo.findRevisions(1L)).thenReturn(Revisions.of(listOf(revision)))

        val result = service.findRevisions(1L) { it.name }

        assertEquals(1, result.content.size)
        assertEquals("test", result.content[0].entity)
    }

    @Test
    fun `findRevisionPages - 페이징된 리비전 반환`() {
        val entity = TestServiceEntity(id = 1L, name = "test")
        val metadata: RevisionMetadata<Int> = mock()
        val revision = Revision.of(metadata, entity)
        val pageable = PageRequest.of(0, 10)
        whenever(mockRepo.findRevisions(1L, pageable)).thenReturn(PageImpl(listOf(revision), pageable, 1))

        val result = service.findRevisionPages(1L, pageable)

        assertEquals(1, result.totalElements)
        assertEquals("test", result.content[0].entity.name)
    }

    @Test
    fun `findRevisionPages - 변환 적용된 페이징 리비전`() {
        val entity = TestServiceEntity(id = 1L, name = "test")
        val metadata: RevisionMetadata<Int> = mock()
        val revision = Revision.of(metadata, entity)
        val pageable = PageRequest.of(0, 10)
        whenever(mockRepo.findRevisions(1L, pageable)).thenReturn(PageImpl(listOf(revision), pageable, 1))

        val result = service.findRevisionPages(1L, pageable) { it.name }

        assertEquals(1, result.totalElements)
        assertEquals("test", result.content[0].entity)
    }
}
