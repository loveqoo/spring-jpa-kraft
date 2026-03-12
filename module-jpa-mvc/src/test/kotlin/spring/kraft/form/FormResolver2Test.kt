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
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.data.jpa.repository.JpaRepository
import spring.kraft.form.fixture.TestCreateForm2
import spring.kraft.form.fixture.TestEntity
import spring.kraft.form.fixture.TestParent1
import spring.kraft.form.fixture.TestParent2
import spring.kraft.form.fixture.TestUpdateForm2

class FormResolver2Test {
    private val mockRepo: JpaRepository<TestEntity, Long> = mock()
    private val mockRepo1: JpaRepository<TestParent1, Long> = mock()
    private val mockRepo2: JpaRepository<TestParent2, String> = mock()
    private val mockValidator: Validator = mock()

    private var lastParent1OnCreate: TestParent1? = null
    private var lastParent2OnCreate: TestParent2? = null
    private var lastParent1OnUpdate: TestParent1? = null
    private var lastParent2OnUpdate: TestParent2? = null

    private val resolver =
        object :
            FormResolver2<Long, TestEntity, TestCreateForm2, TestUpdateForm2, Long, TestParent1, String, TestParent2>() {
            override val repo: JpaRepository<TestEntity, Long> = mockRepo
            override val repo1: JpaRepository<TestParent1, Long> = mockRepo1
            override val repo2: JpaRepository<TestParent2, String> = mockRepo2
            override val validator: Validator = mockValidator

            override fun TestCreateForm2.parentId1(): Result<Long> = Result.success(this.parentId1)

            override fun TestCreateForm2.parentId2(): Result<String> = Result.success(this.parentId2)

            override fun TestCreateForm2.toEntity(
                p1: TestParent1,
                p2: TestParent2,
            ): Result<TestEntity> {
                lastParent1OnCreate = p1
                lastParent2OnCreate = p2
                return Result.success(TestEntity(id = 1L, name = this.name))
            }

            override fun TestUpdateForm2.parentId1(): Result<Long?> = Result.success(this.parentId1)

            override fun TestUpdateForm2.parentId2(): Result<String?> = Result.success(this.parentId2)

            override fun TestUpdateForm2.update(
                entity: TestEntity,
                parent1: TestParent1?,
                parent2: TestParent2?,
            ): Result<Unit> {
                lastParent1OnUpdate = parent1
                lastParent2OnUpdate = parent2
                return Result.success(Unit)
            }
        }

    @BeforeEach
    fun setUp() {
        whenever(mockValidator.validate(any<Any>())).thenReturn(emptySet())
        lastParent1OnCreate = null
        lastParent2OnCreate = null
        lastParent1OnUpdate = null
        lastParent2OnUpdate = null
    }

    @Test
    fun `생성폼 검증 실패 시 ConstraintViolationException 반환`() {
        val violation: ConstraintViolation<Any> = mock()
        whenever(mockValidator.validate(any<Any>())).thenReturn(setOf(violation))

        val form = TestCreateForm2(name = "", parentId1 = 10L, parentId2 = "abc")
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is ConstraintViolationException)
    }

    @Test
    fun `생성폼 검증 성공 시 두 부모 엔티티와 함께 생성`() {
        val parent1 = TestParent1(id = 10L)
        val parent2 = TestParent2(id = "abc")
        whenever(mockRepo1.getReferenceById(10L)).thenReturn(parent1)
        whenever(mockRepo2.getReferenceById("abc")).thenReturn(parent2)

        val form = TestCreateForm2(name = "test", parentId1 = 10L, parentId2 = "abc")
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isSuccess)
        assertEquals("test", result.getOrThrow().name)
        assertEquals(parent1, lastParent1OnCreate)
        assertEquals(parent2, lastParent2OnCreate)
    }

    @Test
    fun `수정폼 검증 실패 시 ConstraintViolationException 반환`() {
        val violation: ConstraintViolation<Any> = mock()
        whenever(mockValidator.validate(any<Any>())).thenReturn(setOf(violation))

        val form = TestUpdateForm2(id = 1L, name = "", parentId1 = 10L, parentId2 = "abc")
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is ConstraintViolationException)
    }

    @Test
    fun `수정폼 검증 성공 시 두 부모 엔티티와 함께 수정`() {
        val existingEntity = TestEntity(id = 1L, name = "old")
        val parent1 = TestParent1(id = 10L)
        val parent2 = TestParent2(id = "abc")
        whenever(mockRepo.getReferenceById(1L)).thenReturn(existingEntity)
        whenever(mockRepo1.getReferenceById(10L)).thenReturn(parent1)
        whenever(mockRepo2.getReferenceById("abc")).thenReturn(parent2)

        val form = TestUpdateForm2(id = 1L, name = "new", parentId1 = 10L, parentId2 = "abc")
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isSuccess)
        assertEquals(parent1, lastParent1OnUpdate)
        assertEquals(parent2, lastParent2OnUpdate)
    }

    @Test
    fun `수정폼에서 부모 ID가 null이면 null 부모로 update 호출`() {
        val existingEntity = TestEntity(id = 1L, name = "old")
        whenever(mockRepo.getReferenceById(1L)).thenReturn(existingEntity)

        val form = TestUpdateForm2(id = 1L, name = "new", parentId1 = null, parentId2 = null)
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isSuccess)
        assertEquals(null, lastParent1OnUpdate)
        assertEquals(null, lastParent2OnUpdate)
    }

    @Test
    fun `생성폼에서 첫 번째 부모 조회 실패 시 Result_failure로 감싸져 반환`() {
        whenever(mockRepo1.getReferenceById(10L)).thenThrow(EntityNotFoundException("parent1 not found"))
        whenever(mockRepo2.getReferenceById("abc")).thenReturn(TestParent2(id = "abc"))

        val form = TestCreateForm2(name = "test", parentId1 = 10L, parentId2 = "abc")
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is EntityNotFoundException)
    }

    @Test
    fun `생성폼에서 첫 번째 부모 조회 실패 시 두 번째 부모 조회는 실행되지 않음`() {
        whenever(mockRepo1.getReferenceById(10L)).thenThrow(EntityNotFoundException("parent1 not found"))

        val form = TestCreateForm2(name = "test", parentId1 = 10L, parentId2 = "abc")
        with(resolver) { form.toEntity() }

        verify(mockRepo2, never()).getReferenceById("abc")
    }
}
