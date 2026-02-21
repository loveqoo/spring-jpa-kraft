package spring.kraft.form

import jakarta.persistence.EntityNotFoundException
import jakarta.validation.ConstraintViolation
import jakarta.validation.ConstraintViolationException
import jakarta.validation.Validator
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertTrue
import org.junit.jupiter.api.BeforeEach
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.springframework.data.jpa.repository.JpaRepository
import spring.kraft.form.fixture.TestCreateForm
import spring.kraft.form.fixture.TestEntity
import spring.kraft.form.fixture.TestUpdateForm

class FormResolver0Test {
    private val mockRepo: JpaRepository<TestEntity, Long> = mock()
    private val mockValidator: Validator = mock()

    private val resolver =
        object : FormResolver0<Long, TestEntity, TestCreateForm, TestUpdateForm>() {
            override val repo: JpaRepository<TestEntity, Long> = mockRepo
            override val validator: Validator = mockValidator

            override fun TestCreateForm.createEntity(): Result<TestEntity> = Result.success(TestEntity(id = 1L, name = this.name))

            override fun TestUpdateForm.modify(entity: TestEntity): Result<Unit> = Result.success(Unit)
        }

    @BeforeEach
    fun setUp() {
        whenever(mockValidator.validate(any<Any>())).thenReturn(emptySet())
    }

    @Test
    fun `생성폼 검증 실패 시 ConstraintViolationException 반환`() {
        val violation: ConstraintViolation<Any> = mock()
        whenever(mockValidator.validate(any<Any>())).thenReturn(setOf(violation))

        val form = TestCreateForm(name = "")
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is ConstraintViolationException)
    }

    @Test
    fun `생성폼 검증 성공 시 엔티티 생성`() {
        val form = TestCreateForm(name = "test")
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isSuccess)
        assertEquals("test", result.getOrThrow().name)
        assertEquals(1L, result.getOrThrow().id)
    }

    @Test
    fun `수정폼 검증 실패 시 ConstraintViolationException 반환`() {
        val violation: ConstraintViolation<Any> = mock()
        whenever(mockValidator.validate(any<Any>())).thenReturn(setOf(violation))

        val form = TestUpdateForm(id = 1L, name = "")
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is ConstraintViolationException)
    }

    @Test
    fun `수정폼 검증 성공 시 엔티티 수정`() {
        val existingEntity = TestEntity(id = 1L, name = "old")
        whenever(mockRepo.getReferenceById(1L)).thenReturn(existingEntity)

        val form = TestUpdateForm(id = 1L, name = "new")
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isSuccess)
        assertEquals(1L, result.getOrThrow().id)
    }

    @Test
    fun `수정폼에서 repo 예외 발생 시 Result_failure로 감싸져 반환`() {
        whenever(mockRepo.getReferenceById(1L)).thenThrow(EntityNotFoundException("not found"))

        val form = TestUpdateForm(id = 1L, name = "new")
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is EntityNotFoundException)
    }
}
