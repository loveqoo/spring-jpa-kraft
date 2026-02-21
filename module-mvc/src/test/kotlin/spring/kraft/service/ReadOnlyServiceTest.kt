package spring.kraft.service

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertNull
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import org.springframework.data.jpa.repository.JpaRepository
import spring.kraft.service.fixture.TestServiceEntity
import java.util.Optional

class ReadOnlyServiceTest {
    private val mockRepo: JpaRepository<TestServiceEntity, Long> = mock()

    private val service =
        object : ReadOnlyService<Long, TestServiceEntity> {
            override val repo: JpaRepository<TestServiceEntity, Long> = mockRepo
            override val tableName: String = "test_entity"
        }

    @Test
    fun `findById - 존재하면 엔티티 반환`() {
        val entity = TestServiceEntity(id = 1L, name = "test")
        whenever(mockRepo.findById(1L)).thenReturn(Optional.of(entity))

        val result = service.findById(1L)

        assertEquals(entity, result)
    }

    @Test
    fun `findById - 존재하지 않으면 null 반환`() {
        whenever(mockRepo.findById(1L)).thenReturn(Optional.empty())

        val result = service.findById(1L)

        assertNull(result)
    }

    @Test
    fun `findById - 변환 함수 적용`() {
        val entity = TestServiceEntity(id = 1L, name = "test")
        whenever(mockRepo.findById(1L)).thenReturn(Optional.of(entity))

        val result = service.findById(1L) { it.name }

        assertEquals("test", result)
    }

    @Test
    fun `findById - 변환 함수 적용 시 존재하지 않으면 null 반환`() {
        whenever(mockRepo.findById(1L)).thenReturn(Optional.empty())

        val result = service.findById(1L) { it.name }

        assertNull(result)
    }

    @Test
    fun `getOne - getReferenceById 위임`() {
        val entity = TestServiceEntity(id = 1L, name = "test")
        whenever(mockRepo.getReferenceById(1L)).thenReturn(entity)

        val result = service.getOne(1L)

        assertEquals(entity, result)
    }

    @Test
    fun `getOne - 변환 함수 적용`() {
        val entity = TestServiceEntity(id = 1L, name = "test")
        whenever(mockRepo.getReferenceById(1L)).thenReturn(entity)

        val result = service.getOne(1L) { it.name }

        assertEquals("test", result)
    }

    @Test
    fun `getByIdIn - findAllById 위임`() {
        val entities = listOf(TestServiceEntity(id = 1L, name = "a"), TestServiceEntity(id = 2L, name = "b"))
        whenever(mockRepo.findAllById(listOf(1L, 2L))).thenReturn(entities)

        val result = service.getByIdIn(listOf(1L, 2L))

        assertEquals(2, result.size)
        assertEquals("a", result[0].name)
        assertEquals("b", result[1].name)
    }

    @Test
    fun `findAll - 페이징 결과 반환`() {
        val pageable = PageRequest.of(0, 10)
        val entities = listOf(TestServiceEntity(id = 1L, name = "a"))
        val page = PageImpl(entities, pageable, 1)
        whenever(mockRepo.findAll(pageable)).thenReturn(page)

        val result = service.findAll(pageable)

        assertEquals(1, result.totalElements)
        assertEquals("a", result.content[0].name)
    }

    @Test
    fun `findAll - 변환 함수 적용`() {
        val pageable = PageRequest.of(0, 10)
        val entities = listOf(TestServiceEntity(id = 1L, name = "a"))
        val page = PageImpl(entities, pageable, 1)
        whenever(mockRepo.findAll(pageable)).thenReturn(page)

        val result = service.findAll(pageable) { it.name }

        assertEquals(1, result.totalElements)
        assertEquals("a", result.content[0])
    }
}
