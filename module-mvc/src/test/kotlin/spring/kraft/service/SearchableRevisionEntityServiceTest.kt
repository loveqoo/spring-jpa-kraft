package spring.kraft.service

import com.querydsl.core.types.Predicate
import jakarta.validation.Validator
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.history.Revision
import org.springframework.data.history.RevisionMetadata
import org.springframework.data.history.Revisions
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.querydsl.QuerydslPredicateExecutor
import org.springframework.data.repository.history.RevisionRepository
import spring.kraft.form.FormResolver
import spring.kraft.form.FormResolver0
import spring.kraft.jpa.repo.DynamicSearchRepository
import spring.kraft.service.fixture.ServiceCreateForm
import spring.kraft.service.fixture.ServiceUpdateForm
import spring.kraft.service.fixture.TestServiceEntity

private interface TestFullRepo :
    JpaRepository<TestServiceEntity, Long>,
    QuerydslPredicateExecutor<TestServiceEntity>,
    DynamicSearchRepository<Long, TestServiceEntity>,
    RevisionRepository<TestServiceEntity, Long, Int>

class SearchableRevisionEntityServiceTest {
    private val mockRepo: TestFullRepo = mock()
    private val mockValidator: Validator = mock()

    private val resolver =
        object : FormResolver0<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm>() {
            override val repo: JpaRepository<TestServiceEntity, Long> = mockRepo
            override val validator: Validator = mockValidator

            override fun ServiceCreateForm.createEntity(): Result<TestServiceEntity> = Result.success(TestServiceEntity(name = this.name))

            override fun ServiceUpdateForm.modify(entity: TestServiceEntity): Result<Unit> = Result.success(Unit)
        }

    private val service =
        object :
            SearchableRevisionEntityService<
                Long,
                TestServiceEntity,
                TestFullRepo,
                ServiceCreateForm,
                ServiceUpdateForm,
            > {
            override val repo: TestFullRepo = mockRepo
            override val tableName: String = "test_entity"
            override val formResolver:
                FormResolver<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm> = resolver
        }

    @BeforeEach
    fun setUp() {
        whenever(mockValidator.validate(any<Any>())).thenReturn(emptySet())
    }

    @Test
    fun `search와 revision 메서드 모두 동작`() {
        // search
        val predicate: Predicate = mock()
        val pageable = PageRequest.of(0, 10)
        val entities = listOf(TestServiceEntity(id = 1L, name = "test"))
        whenever(mockRepo.findAll(eq(predicate), eq(pageable))).thenReturn(PageImpl(entities, pageable, 1))

        val searchResult = service.search(predicate, pageable)
        assertEquals(1, searchResult.totalElements)

        // revision
        val entity = TestServiceEntity(id = 1L, name = "test")
        val metadata: RevisionMetadata<Int> = mock()
        val revision = Revision.of(metadata, entity)
        whenever(mockRepo.findRevisions(1L)).thenReturn(Revisions.of(listOf(revision)))

        val revisionResult = service.findRevisions(1L)
        assertEquals(1, revisionResult.content.size)
    }
}
