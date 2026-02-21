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
import spring.kraft.form.fixture.TestCreateForm1
import spring.kraft.form.fixture.TestEntity
import spring.kraft.form.fixture.TestParent1
import spring.kraft.form.fixture.TestUpdateForm1

class FormResolver1Test {
    private val mockRepo: JpaRepository<TestEntity, Long> = mock()
    private val mockRepo1: JpaRepository<TestParent1, Long> = mock()
    private val mockValidator: Validator = mock()

    private var lastParentOnCreate: TestParent1? = null
    private var lastParentOnUpdate: TestParent1? = null

    private val resolver =
        object : FormResolver1<Long, TestEntity, TestCreateForm1, TestUpdateForm1, Long, TestParent1>() {
            override val repo: JpaRepository<TestEntity, Long> = mockRepo
            override val repo1: JpaRepository<TestParent1, Long> = mockRepo1
            override val validator: Validator = mockValidator

            override fun TestCreateForm1.parentId(): Result<Long> = Result.success(this.parentId)

            override fun TestCreateForm1.toEntity(p1: TestParent1): Result<TestEntity> {
                lastParentOnCreate = p1
                return Result.success(TestEntity(id = 1L, name = this.name))
            }

            override fun TestUpdateForm1.parentId(): Result<Long?> = Result.success(this.parentId)

            override fun TestUpdateForm1.update(
                entity: TestEntity,
                parent: TestParent1?,
            ): Result<Unit> {
                lastParentOnUpdate = parent
                return Result.success(Unit)
            }
        }

    @BeforeEach
    fun setUp() {
        whenever(mockValidator.validate(any<Any>())).thenReturn(emptySet())
        lastParentOnCreate = null
        lastParentOnUpdate = null
    }

    @Test
    fun `생성폼 검증 실패 시 ConstraintViolationException 반환`() {
        val violation: ConstraintViolation<Any> = mock()
        whenever(mockValidator.validate(any<Any>())).thenReturn(setOf(violation))

        val form = TestCreateForm1(name = "", parentId = 10L)
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is ConstraintViolationException)
    }

    @Test
    fun `생성폼 검증 성공 시 부모 엔티티와 함께 생성`() {
        val parent = TestParent1(id = 10L)
        whenever(mockRepo1.getReferenceById(10L)).thenReturn(parent)

        val form = TestCreateForm1(name = "test", parentId = 10L)
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isSuccess)
        assertEquals("test", result.getOrThrow().name)
        assertEquals(parent, lastParentOnCreate)
    }

    @Test
    fun `수정폼 검증 실패 시 ConstraintViolationException 반환`() {
        val violation: ConstraintViolation<Any> = mock()
        whenever(mockValidator.validate(any<Any>())).thenReturn(setOf(violation))

        val form = TestUpdateForm1(id = 1L, name = "", parentId = 10L)
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is ConstraintViolationException)
    }

    @Test
    fun `수정폼 검증 성공 시 부모 엔티티와 함께 수정`() {
        val existingEntity = TestEntity(id = 1L, name = "old")
        val parent = TestParent1(id = 10L)
        whenever(mockRepo.getReferenceById(1L)).thenReturn(existingEntity)
        whenever(mockRepo1.getReferenceById(10L)).thenReturn(parent)

        val form = TestUpdateForm1(id = 1L, name = "new", parentId = 10L)
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isSuccess)
        assertEquals(parent, lastParentOnUpdate)
    }

    @Test
    fun `수정폼에서 부모 ID가 null이면 null 부모로 update 호출`() {
        val existingEntity = TestEntity(id = 1L, name = "old")
        whenever(mockRepo.getReferenceById(1L)).thenReturn(existingEntity)

        val form = TestUpdateForm1(id = 1L, name = "new", parentId = null)
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isSuccess)
        assertEquals(null, lastParentOnUpdate)
    }

    @Test
    fun `생성폼에서 부모 조회 실패 시 Result_failure로 감싸져 반환`() {
        whenever(mockRepo1.getReferenceById(10L)).thenThrow(EntityNotFoundException("parent not found"))

        val form = TestCreateForm1(name = "test", parentId = 10L)
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is EntityNotFoundException)
    }

    @Test
    fun `수정폼에서 엔티티 조회 실패 시 Result_failure로 감싸져 반환`() {
        whenever(mockRepo.getReferenceById(1L)).thenThrow(EntityNotFoundException("entity not found"))

        val form = TestUpdateForm1(id = 1L, name = "new", parentId = 10L)
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is EntityNotFoundException)
    }
}
