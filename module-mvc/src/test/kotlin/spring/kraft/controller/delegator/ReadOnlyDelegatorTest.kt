package spring.kraft.controller.delegator

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.mockito.kotlin.any
import org.mockito.kotlin.eq
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.whenever
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.PageRequest
import spring.kraft.controller.delegator.fixture.TestReadOnlyMapper
import spring.kraft.service.ReadOnlyEntityService
import spring.kraft.service.fixture.TestServiceEntity

class ReadOnlyDelegatorTest {
    private val mockService: ReadOnlyEntityService<Long, TestServiceEntity> = mock()
    private val mockMapper: TestReadOnlyMapper = mock()
    private val delegator = ReadOnlyDelegator(mockService, mockMapper)

    @Test
    fun `list - mapper toReadDto 적용하여 Page 반환`() {
        val pageable = PageRequest.of(0, 10)
        val mappedPage = PageImpl(listOf("dto-test"), pageable, 1)
        whenever(mockService.findAll(eq(pageable), any<(TestServiceEntity) -> String>())).thenReturn(mappedPage)

        val result = delegator.list(pageable)

        assertEquals(1, result.totalElements)
        assertEquals("dto-test", result.content[0])
    }

    @Test
    fun `list - transformer 오버로드는 service findAll에 위임`() {
        val pageable = PageRequest.of(0, 10)
        val transformer: (TestServiceEntity) -> Int = { it.name.length }
        val page = PageImpl(listOf(4), pageable, 1)
        whenever(mockService.findAll(pageable, transformer)).thenReturn(page)

        val result = delegator.list(pageable, transformer)

        assertEquals(4, result.content[0])
        verify(mockService).findAll(pageable, transformer)
    }

    @Test
    fun `getOne - mapper toReadDto 적용하여 D 반환`() {
        whenever(mockService.getOne(eq(1L), any<(TestServiceEntity) -> String>())).thenReturn("dto-test")

        val result = delegator.getOne(1L)

        assertEquals("dto-test", result)
    }

    @Test
    fun `getOne - transformer 오버로드는 service getOne에 위임`() {
        val transformer: (TestServiceEntity) -> Int = { it.name.length }
        whenever(mockService.getOne(1L, transformer)).thenReturn(4)

        val result = delegator.getOne(1L, transformer)

        assertEquals(4, result)
        verify(mockService).getOne(1L, transformer)
    }
}
