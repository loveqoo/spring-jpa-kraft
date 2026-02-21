package spring.kraft.service

import jakarta.validation.Validator
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.data.jpa.repository.JpaRepository
import spring.kraft.form.FormResolver
import spring.kraft.form.FormResolver0
import spring.kraft.service.fixture.ServiceCreateForm
import spring.kraft.service.fixture.ServiceUpdateForm
import spring.kraft.service.fixture.TestCheckableEntity
import spring.kraft.service.fixture.TestServiceEntity

class BaseEntityServiceTest {
    private val mockRepo: JpaRepository<TestServiceEntity, Long> = mock()
    private val mockValidator: Validator = mock()

    private val resolver =
        object : FormResolver0<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm>() {
            override val repo: JpaRepository<TestServiceEntity, Long> = mockRepo
            override val validator: Validator = mockValidator

            override fun ServiceCreateForm.createEntity(): Result<TestServiceEntity> = Result.success(TestServiceEntity(name = this.name))

            override fun ServiceUpdateForm.modify(entity: TestServiceEntity): Result<Unit> = Result.success(Unit)
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

                override fun ServiceUpdateForm.modify(entity: TestCheckableEntity): Result<Unit> = Result.success(Unit)
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

                override fun ServiceUpdateForm.modify(entity: TestServiceEntity): Result<Unit> = Result.success(Unit)
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
}
