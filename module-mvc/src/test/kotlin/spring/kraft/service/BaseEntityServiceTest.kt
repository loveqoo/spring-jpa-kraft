package spring.kraft.service

import jakarta.validation.Validator
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.data.jpa.repository.JpaRepository
import spring.kraft.form.FormResolver
import spring.kraft.form.FormResolver0
import spring.kraft.service.fixture.ServiceCreateForm
import spring.kraft.service.fixture.ServiceUpdateForm
import spring.kraft.service.fixture.TestAggregateEntity
import spring.kraft.service.fixture.TestAggregateRoot
import spring.kraft.service.fixture.TestCheckableEntity
import spring.kraft.service.fixture.TestServiceEntity
import java.util.Optional

class BaseEntityServiceTest {
    private val mockRepo: JpaRepository<TestServiceEntity, Long> = mock()
    private val mockValidator: Validator = mock()

    private val resolver =
        object : FormResolver0<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm>() {
            override val repo: JpaRepository<TestServiceEntity, Long> = mockRepo
            override val validator: Validator = mockValidator

            override fun ServiceCreateForm.createEntity(): Result<TestServiceEntity> = Result.success(TestServiceEntity(name = this.name))

            override fun ServiceUpdateForm.update(entity: TestServiceEntity): Result<Unit> = Result.success(Unit)
        }

    private val service =
        object : BaseEntityService<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm> {
            override val repo: JpaRepository<TestServiceEntity, Long> = mockRepo
            override val tableName: String = "test_entity"
            override val formResolver: FormResolver<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm> =
                resolver
        }

    @BeforeEach
    fun setUp() {
        whenever(mockValidator.validate(any<Any>())).thenReturn(emptySet())
    }

    @Test
    fun `create - formResolver로 엔티티 생성 후 save`() {
        whenever(mockRepo.save(any<TestServiceEntity>())).thenAnswer { it.arguments[0] }

        val result = service.create(ServiceCreateForm(name = "test"))

        assertEquals("test", result.name)
        verify(mockRepo).save(any<TestServiceEntity>())
    }

    @Test
    fun `create - Checkable 엔티티는 save 후 check 호출`() {
        val checkableRepo: JpaRepository<TestCheckableEntity, Long> = mock()
        val checkableValidator: Validator = mock()
        whenever(checkableValidator.validate(any<Any>())).thenReturn(emptySet())

        val checkableResolver =
            object : FormResolver0<Long, TestCheckableEntity, ServiceCreateForm, ServiceUpdateForm>() {
                override val repo: JpaRepository<TestCheckableEntity, Long> = checkableRepo
                override val validator: Validator = checkableValidator

                override fun ServiceCreateForm.createEntity(): Result<TestCheckableEntity> =
                    Result.success(TestCheckableEntity(name = this.name))

                override fun ServiceUpdateForm.update(entity: TestCheckableEntity): Result<Unit> = Result.success(Unit)
            }

        val checkableService =
            object : BaseEntityService<Long, TestCheckableEntity, ServiceCreateForm, ServiceUpdateForm> {
                override val repo: JpaRepository<TestCheckableEntity, Long> = checkableRepo
                override val tableName: String = "test_checkable"
                override val formResolver:
                    FormResolver<Long, TestCheckableEntity, ServiceCreateForm, ServiceUpdateForm> = checkableResolver
            }

        whenever(checkableRepo.save(any<TestCheckableEntity>())).thenAnswer { it.arguments[0] }

        val result = checkableService.create(ServiceCreateForm(name = "test"))

        assertTrue(result.checked)
    }

    @Test
    fun `update - formResolver로 엔티티 수정 후 save`() {
        val existing = TestServiceEntity(id = 1L, name = "old")
        whenever(mockRepo.getReferenceById(1L)).thenReturn(existing)
        whenever(mockRepo.save(any<TestServiceEntity>())).thenAnswer { it.arguments[0] }

        val result = service.update(ServiceUpdateForm(id = 1L, name = "new"))

        assertEquals(1L, result.id)
        verify(mockRepo).save(any<TestServiceEntity>())
    }

    @Test
    fun `delete - repo deleteById 위임`() {
        service.delete(1L)

        verify(mockRepo).deleteById(1L)
    }

    @Test
    fun `create 실패 - formResolver가 Result failure 반환 시 예외 전파`() {
        val failResolver =
            object : FormResolver0<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm>() {
                override val repo: JpaRepository<TestServiceEntity, Long> = mockRepo
                override val validator: Validator = mockValidator

                override fun ServiceCreateForm.createEntity(): Result<TestServiceEntity> =
                    Result.failure(IllegalArgumentException("invalid"))

                override fun ServiceUpdateForm.update(entity: TestServiceEntity): Result<Unit> = Result.success(Unit)
            }

        val failService =
            object : BaseEntityService<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm> {
                override val repo: JpaRepository<TestServiceEntity, Long> = mockRepo
                override val tableName: String = "test_entity"
                override val formResolver:
                    FormResolver<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm> = failResolver
            }

        assertThrows(IllegalArgumentException::class.java) {
            failService.create(ServiceCreateForm(name = "test"))
        }
    }

    @Test
    fun `afterSave - AggregateRootAware 엔티티면 aggregateRootAwareServices에 publishEvent 호출`() {
        val aggRepo: JpaRepository<TestAggregateEntity, Long> = mock()
        val aggValidator: Validator = mock()
        val mockAggregateRootAwareService: AggregateRootAwareService<Long, TestAggregateEntity, TestAggregateRoot> =
            mock()
        whenever(aggValidator.validate(any<Any>())).thenReturn(emptySet())

        val root = TestAggregateRoot(id = 1L)
        val aggResolver =
            object : FormResolver0<Long, TestAggregateEntity, ServiceCreateForm, ServiceUpdateForm>() {
                override val repo: JpaRepository<TestAggregateEntity, Long> = aggRepo
                override val validator: Validator = aggValidator

                override fun ServiceCreateForm.createEntity(): Result<TestAggregateEntity> =
                    Result.success(TestAggregateEntity(id = 10L, root = root))

                override fun ServiceUpdateForm.update(entity: TestAggregateEntity): Result<Unit> = Result.success(Unit)
            }

        val aggService =
            object : BaseEntityService<Long, TestAggregateEntity, ServiceCreateForm, ServiceUpdateForm> {
                override val repo: JpaRepository<TestAggregateEntity, Long> = aggRepo
                override val tableName: String = "test_aggregate_entity"
                override val formResolver:
                    FormResolver<Long, TestAggregateEntity, ServiceCreateForm, ServiceUpdateForm> = aggResolver
                override val aggregateRootAwareServices: List<AggregateRootAwareService<*, *, *>> =
                    listOf(mockAggregateRootAwareService)
            }

        whenever(aggRepo.save(any<TestAggregateEntity>())).thenAnswer { it.arguments[0] }

        aggService.create(ServiceCreateForm(name = "test"))

        verify(mockAggregateRootAwareService).publishEvent(any())
    }

    @Test
    fun `afterSave - 일반 엔티티면 publishEvent 미호출`() {
        val mockAggregateRootAwareService: AggregateRootAwareService<Long, TestAggregateEntity, TestAggregateRoot> =
            mock()

        val serviceWithAgg =
            object : BaseEntityService<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm> {
                override val repo: JpaRepository<TestServiceEntity, Long> = mockRepo
                override val tableName: String = "test_entity"
                override val formResolver:
                    FormResolver<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm> = resolver
                override val aggregateRootAwareServices: List<AggregateRootAwareService<*, *, *>> =
                    listOf(mockAggregateRootAwareService)
            }

        whenever(mockRepo.save(any<TestServiceEntity>())).thenAnswer { it.arguments[0] }

        serviceWithAgg.create(ServiceCreateForm(name = "test"))

        verify(mockAggregateRootAwareService, never()).publishEvent(any())
    }

    @Test
    fun `beforeDelete - AggregateRootAware 엔티티면 publishEvent 호출 후 deleteById`() {
        val aggRepo: JpaRepository<TestAggregateEntity, Long> = mock()
        val aggValidator: Validator = mock()
        val mockAggregateRootAwareService: AggregateRootAwareService<Long, TestAggregateEntity, TestAggregateRoot> =
            mock()

        val root = TestAggregateRoot(id = 1L)
        val entity = TestAggregateEntity(id = 10L, root = root)
        val aggResolver =
            object : FormResolver0<Long, TestAggregateEntity, ServiceCreateForm, ServiceUpdateForm>() {
                override val repo: JpaRepository<TestAggregateEntity, Long> = aggRepo
                override val validator: Validator = aggValidator

                override fun ServiceCreateForm.createEntity(): Result<TestAggregateEntity> = Result.success(entity)

                override fun ServiceUpdateForm.update(entity: TestAggregateEntity): Result<Unit> = Result.success(Unit)
            }

        val aggService =
            object : BaseEntityService<Long, TestAggregateEntity, ServiceCreateForm, ServiceUpdateForm> {
                override val repo: JpaRepository<TestAggregateEntity, Long> = aggRepo
                override val tableName: String = "test_aggregate_entity"
                override val formResolver:
                    FormResolver<Long, TestAggregateEntity, ServiceCreateForm, ServiceUpdateForm> = aggResolver
                override val aggregateRootAwareServices: List<AggregateRootAwareService<*, *, *>> =
                    listOf(mockAggregateRootAwareService)
            }

        whenever(aggRepo.findById(10L)).thenReturn(Optional.of(entity))

        aggService.delete(10L)

        verify(mockAggregateRootAwareService).publishEvent(entity)
        verify(aggRepo).deleteById(10L)
    }

    @Test
    fun `beforeDelete - aggregateRootAwareServices가 비어있으면 findById 호출 없이 바로 삭제`() {
        service.delete(1L)

        verify(mockRepo, never()).findById(any())
        verify(mockRepo).deleteById(1L)
    }
}
