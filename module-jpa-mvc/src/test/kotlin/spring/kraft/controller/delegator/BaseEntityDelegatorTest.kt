package spring.kraft.controller.delegator

import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Assertions.assertThrows
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.verify
import org.mockito.kotlin.verifyNoInteractions
import org.mockito.kotlin.whenever
import org.springframework.validation.Errors
import org.springframework.validation.FieldError
import spring.kraft.controller.delegator.fixture.TestBaseEntityMapper
import spring.kraft.controller.dto.MutationResponse
import spring.kraft.controller.exception.FormValidationException
import spring.kraft.service.BaseEntityService
import spring.kraft.service.fixture.ServiceCreateForm
import spring.kraft.service.fixture.ServiceUpdateForm
import spring.kraft.service.fixture.TestServiceEntity

class BaseEntityDelegatorTest {
    private val mockService: BaseEntityService<Long, TestServiceEntity, ServiceCreateForm, ServiceUpdateForm> = mock()
    private val mockMapper: TestBaseEntityMapper = mock()
    private val delegator = BaseEntityDelegator(mockService, mockMapper)

    @Test
    fun `createOne - errors 없으면 service create 후 mapper toCreateDto 반환`() {
        val form = ServiceCreateForm(name = "new")
        val errors: Errors = mock()
        val entity = TestServiceEntity(id = 1L, name = "new")
        val response = MutationResponse.create(1L, "test")
        whenever(errors.hasErrors()).thenReturn(false)
        whenever(mockService.create(form)).thenReturn(entity)
        whenever(mockMapper.toCreateDto(entity)).thenReturn(response)

        val result = delegator.createOne(form, errors)

        assertEquals(response, result)
        verify(mockService).create(form)
    }

    @Test
    fun `createOne - errors 있으면 FormValidationException 발생, service 미호출`() {
        val form = ServiceCreateForm(name = "new")
        val errors: Errors = mock()
        val fieldError = FieldError("form", "name", "must not be blank")
        whenever(errors.hasErrors()).thenReturn(true)
        whenever(errors.allErrors).thenReturn(listOf(fieldError))

        val ex =
            assertThrows(FormValidationException::class.java) {
                delegator.createOne(form, errors)
            }

        assertEquals(1, ex.errors.size)
        assertEquals("name", (ex.errors[0] as FieldError).field)
        verifyNoInteractions(mockService)
    }

    @Test
    fun `updateOne - errors 없으면 service update 후 mapper toUpdateDto 반환`() {
        val form = ServiceUpdateForm(id = 1L, name = "updated")
        val errors: Errors = mock()
        val entity = TestServiceEntity(id = 1L, name = "updated")
        val response = MutationResponse.update(1L, "test")
        whenever(errors.hasErrors()).thenReturn(false)
        whenever(mockService.update(form)).thenReturn(entity)
        whenever(mockMapper.toUpdateDto(entity)).thenReturn(response)

        val result = delegator.updateOne(form, errors)

        assertEquals(response, result)
        verify(mockService).update(form)
    }

    @Test
    fun `updateOne - errors 있으면 FormValidationException 발생, service 미호출`() {
        val form = ServiceUpdateForm(id = 1L, name = "updated")
        val errors: Errors = mock()
        val fieldError = FieldError("form", "name", "must not be blank")
        whenever(errors.hasErrors()).thenReturn(true)
        whenever(errors.allErrors).thenReturn(listOf(fieldError))

        val ex =
            assertThrows(FormValidationException::class.java) {
                delegator.updateOne(form, errors)
            }

        assertEquals(1, ex.errors.size)
        assertEquals("name", (ex.errors[0] as FieldError).field)
        verifyNoInteractions(mockService)
    }

    @Test
    fun `delete - service delete 후 mapper toDeleteDto 반환`() {
        val response = MutationResponse.delete(1L, "test")
        whenever(mockMapper.toDeleteDto(1L)).thenReturn(response)

        val result = delegator.delete(1L)

        assertEquals(response, result)
        verify(mockService).delete(1L)
    }

    @Test
    fun `toCreateDto - MutationResponse 생성`() {
        val entity = TestServiceEntity(id = 1L, name = "test")

        val result = delegator.toCreateDto(entity, "TestEntity")

        assertEquals("create", result.action)
        assertEquals("1", result.id)
        assertEquals("TestEntity", result.name)
    }

    @Test
    fun `toUpdateDto - MutationResponse 생성`() {
        val entity = TestServiceEntity(id = 1L, name = "test")

        val result = delegator.toUpdateDto(entity, "TestEntity")

        assertEquals("update", result.action)
        assertEquals("1", result.id)
        assertEquals("TestEntity", result.name)
    }

    @Test
    fun `toDeleteDto - MutationResponse 생성`() {
        val result = delegator.toDeleteDto(1L, "TestEntity")

        assertEquals("delete", result.action)
        assertEquals("1", result.id)
        assertEquals("TestEntity", result.name)
    }
}
