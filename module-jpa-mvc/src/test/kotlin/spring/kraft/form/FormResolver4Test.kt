package spring.kraft.form

import jakarta.persistence.EntityNotFoundException
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
import spring.kraft.form.fixture.TestCreateForm4
import spring.kraft.form.fixture.TestEntity
import spring.kraft.form.fixture.TestParent1
import spring.kraft.form.fixture.TestParent2
import spring.kraft.form.fixture.TestParent3
import spring.kraft.form.fixture.TestParent4
import spring.kraft.form.fixture.TestUpdateForm4

class FormResolver4Test {
    private val mockRepo: JpaRepository<TestEntity, Long> = mock()
    private val mockRepo1: JpaRepository<TestParent1, Long> = mock()
    private val mockRepo2: JpaRepository<TestParent2, String> = mock()
    private val mockRepo3: JpaRepository<TestParent3, Long> = mock()
    private val mockRepo4: JpaRepository<TestParent4, Long> = mock()
    private val mockValidator: Validator = mock()

    private var lastParent1OnCreate: TestParent1? = null
    private var lastParent2OnCreate: TestParent2? = null
    private var lastParent3OnCreate: TestParent3? = null
    private var lastParent4OnCreate: TestParent4? = null
    private var lastParent1OnUpdate: TestParent1? = null
    private var lastParent2OnUpdate: TestParent2? = null
    private var lastParent3OnUpdate: TestParent3? = null
    private var lastParent4OnUpdate: TestParent4? = null

    private val resolver =
        object :
            FormResolver4<
                Long,
                TestEntity,
                TestCreateForm4,
                TestUpdateForm4,
                Long,
                TestParent1,
                String,
                TestParent2,
                Long,
                TestParent3,
                Long,
                TestParent4,
            >() {
            override val repo: JpaRepository<TestEntity, Long> = mockRepo
            override val repo1: JpaRepository<TestParent1, Long> = mockRepo1
            override val repo2: JpaRepository<TestParent2, String> = mockRepo2
            override val repo3: JpaRepository<TestParent3, Long> = mockRepo3
            override val repo4: JpaRepository<TestParent4, Long> = mockRepo4
            override val validator: Validator = mockValidator

            override fun TestCreateForm4.parentId1(): Result<Long> = Result.success(this.parentId1)

            override fun TestCreateForm4.parentId2(): Result<String> = Result.success(this.parentId2)

            override fun TestCreateForm4.parentId3(): Result<Long> = Result.success(this.parentId3)

            override fun TestCreateForm4.parentId4(): Result<Long> = Result.success(this.parentId4)

            override fun TestCreateForm4.toEntity(
                p1: TestParent1,
                p2: TestParent2,
                p3: TestParent3,
                p4: TestParent4,
            ): Result<TestEntity> {
                lastParent1OnCreate = p1
                lastParent2OnCreate = p2
                lastParent3OnCreate = p3
                lastParent4OnCreate = p4
                return Result.success(TestEntity(id = 1L, name = this.name))
            }

            override fun TestUpdateForm4.parentId1(): Result<Long?> = Result.success(this.parentId1)

            override fun TestUpdateForm4.parentId2(): Result<String?> = Result.success(this.parentId2)

            override fun TestUpdateForm4.parentId3(): Result<Long?> = Result.success(this.parentId3)

            override fun TestUpdateForm4.parentId4(): Result<Long?> = Result.success(this.parentId4)

            override fun TestUpdateForm4.update(
                entity: TestEntity,
                parent1: TestParent1?,
                parent2: TestParent2?,
                parent3: TestParent3?,
                parent4: TestParent4?,
            ): Result<Unit> {
                lastParent1OnUpdate = parent1
                lastParent2OnUpdate = parent2
                lastParent3OnUpdate = parent3
                lastParent4OnUpdate = parent4
                return Result.success(Unit)
            }
        }

    @BeforeEach
    fun setUp() {
        whenever(mockValidator.validate(any<Any>())).thenReturn(emptySet())
        lastParent1OnCreate = null
        lastParent2OnCreate = null
        lastParent3OnCreate = null
        lastParent4OnCreate = null
        lastParent1OnUpdate = null
        lastParent2OnUpdate = null
        lastParent3OnUpdate = null
        lastParent4OnUpdate = null
    }

    @Test
    fun `생성폼 검증 성공 시 네 부모 엔티티와 함께 생성`() {
        val parent1 = TestParent1(id = 10L)
        val parent2 = TestParent2(id = "abc")
        val parent3 = TestParent3(id = 30L)
        val parent4 = TestParent4(id = 40L)
        whenever(mockRepo1.getReferenceById(10L)).thenReturn(parent1)
        whenever(mockRepo2.getReferenceById("abc")).thenReturn(parent2)
        whenever(mockRepo3.getReferenceById(30L)).thenReturn(parent3)
        whenever(mockRepo4.getReferenceById(40L)).thenReturn(parent4)

        val form = TestCreateForm4(name = "test", parentId1 = 10L, parentId2 = "abc", parentId3 = 30L, parentId4 = 40L)
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isSuccess)
        assertEquals("test", result.getOrThrow().name)
        assertEquals(parent1, lastParent1OnCreate)
        assertEquals(parent2, lastParent2OnCreate)
        assertEquals(parent3, lastParent3OnCreate)
        assertEquals(parent4, lastParent4OnCreate)
    }

    @Test
    fun `수정폼 검증 성공 시 네 부모 엔티티와 함께 수정`() {
        val existingEntity = TestEntity(id = 1L, name = "old")
        val parent1 = TestParent1(id = 10L)
        val parent2 = TestParent2(id = "abc")
        val parent3 = TestParent3(id = 30L)
        val parent4 = TestParent4(id = 40L)
        whenever(mockRepo.getReferenceById(1L)).thenReturn(existingEntity)
        whenever(mockRepo1.getReferenceById(10L)).thenReturn(parent1)
        whenever(mockRepo2.getReferenceById("abc")).thenReturn(parent2)
        whenever(mockRepo3.getReferenceById(30L)).thenReturn(parent3)
        whenever(mockRepo4.getReferenceById(40L)).thenReturn(parent4)

        val form =
            TestUpdateForm4(id = 1L, name = "new", parentId1 = 10L, parentId2 = "abc", parentId3 = 30L, parentId4 = 40L)
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isSuccess)
        assertEquals(parent1, lastParent1OnUpdate)
        assertEquals(parent2, lastParent2OnUpdate)
        assertEquals(parent3, lastParent3OnUpdate)
        assertEquals(parent4, lastParent4OnUpdate)
    }

    @Test
    fun `수정폼에서 일부 부모 ID가 null이면 해당 부모만 null로 전달`() {
        val existingEntity = TestEntity(id = 1L, name = "old")
        val parent2 = TestParent2(id = "abc")
        val parent4 = TestParent4(id = 40L)
        whenever(mockRepo.getReferenceById(1L)).thenReturn(existingEntity)
        whenever(mockRepo2.getReferenceById("abc")).thenReturn(parent2)
        whenever(mockRepo4.getReferenceById(40L)).thenReturn(parent4)

        val form =
            TestUpdateForm4(id = 1L, name = "new", parentId1 = null, parentId2 = "abc", parentId3 = null, parentId4 = 40L)
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isSuccess)
        assertEquals(null, lastParent1OnUpdate)
        assertEquals(parent2, lastParent2OnUpdate)
        assertEquals(null, lastParent3OnUpdate)
        assertEquals(parent4, lastParent4OnUpdate)
    }

    @Test
    fun `생성폼에서 첫 번째 부모 조회 실패 시 나머지 부모 조회는 실행되지 않음`() {
        whenever(mockRepo1.getReferenceById(10L)).thenThrow(EntityNotFoundException("parent1 not found"))

        val form = TestCreateForm4(name = "test", parentId1 = 10L, parentId2 = "abc", parentId3 = 30L, parentId4 = 40L)
        val result = with(resolver) { form.toEntity() }

        assertTrue(result.isFailure)
        assertTrue(result.exceptionOrNull() is EntityNotFoundException)
        verify(mockRepo2, never()).getReferenceById("abc")
        verify(mockRepo3, never()).getReferenceById(30L)
        verify(mockRepo4, never()).getReferenceById(40L)
    }
}
