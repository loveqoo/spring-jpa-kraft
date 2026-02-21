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
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.querydsl.QuerydslPredicateExecutor
import spring.kraft.form.FormResolver
import spring.kraft.form.FormResolver0
import spring.kraft.jpa.repo.DynamicSearchRepository
import spring.kraft.service.fixture.ServiceCreateForm
import spring.kraft.service.fixture.ServiceUpdateForm
import spring.kraft.service.fixture.TestServiceEntity

private interface TestSearchableRepo :
    JpaRepository<TestServiceEntity, Long>,
    QuerydslPredicateExecutor<TestServiceEntity>,
    DynamicSearchRepository<Long, TestServiceEntity>

class SearchableEntityServiceTest {
    private val mockRepo: TestSearchableRepo = mock()
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
            SearchableEntityService<Long, TestServiceEntity, TestSearchableRepo, ServiceCreateForm, ServiceUpdateForm> {
            override val repo: TestSearchableRepo = mockRepo
            override val tableName: String = "test_entity"
            override val formResolver:
                FormResolver<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm> = resolver
        }

    @BeforeEach
    fun setUp() {
        whenever(mockValidator.validate(any<Any>())).thenReturn(emptySet())
    }

    @Test
    fun `search - QueryDSL predicate 검색`() {
        val predicate: Predicate = mock()
        val pageable = PageRequest.of(0, 10)
        val entities = listOf(TestServiceEntity(id = 1L, name = "found"))
        whenever(mockRepo.findAll(eq(predicate), eq(pageable))).thenReturn(PageImpl(entities, pageable, 1))

        val result = service.search(predicate, pageable)

        assertEquals(1, result.totalElements)
        assertEquals("found", result.content[0].name)
    }

    @Test
    fun `search - 변환 적용`() {
        val predicate: Predicate = mock()
        val pageable = PageRequest.of(0, 10)
        val entities = listOf(TestServiceEntity(id = 1L, name = "found"))
        whenever(mockRepo.findAll(eq(predicate), eq(pageable))).thenReturn(PageImpl(entities, pageable, 1))

        val result = service.search(predicate, pageable) { it.name }

        assertEquals("found", result.content[0])
    }

    @Test
    fun `searchCustom - dynamicSearch 위임`() {
        val params = mapOf("name" to "test")
        val pageable = PageRequest.of(0, 10)
        val entities = listOf(TestServiceEntity(id = 1L, name = "test"))
        whenever(mockRepo.dynamicSearch(eq(pageable), eq(params))).thenReturn(PageImpl(entities, pageable, 1))

        val result = service.searchCustom(params, pageable)

        assertEquals(1, result.totalElements)
        assertEquals("test", result.content[0].name)
    }

    @Test
    fun `searchCustom - 변환 적용`() {
        val params = mapOf("name" to "test")
        val pageable = PageRequest.of(0, 10)
        val entities = listOf(TestServiceEntity(id = 1L, name = "test"))
        whenever(mockRepo.dynamicSearch(eq(pageable), eq(params))).thenReturn(PageImpl(entities, pageable, 1))

        val result = service.searchCustom(params, pageable) { it.name }

        assertEquals("test", result.content[0])
    }
}
