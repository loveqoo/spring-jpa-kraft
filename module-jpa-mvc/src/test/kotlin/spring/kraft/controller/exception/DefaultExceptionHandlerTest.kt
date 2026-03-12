package spring.kraft.controller.exception

import jakarta.persistence.EntityNotFoundException
import jakarta.validation.ConstraintViolation
import jakarta.validation.ConstraintViolationException
import jakarta.validation.Path
import org.junit.jupiter.api.Assertions.assertEquals
import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.whenever
import org.springframework.http.HttpStatus
import org.springframework.validation.FieldError
import org.springframework.validation.ObjectError

class DefaultExceptionHandlerTest {
    private val handler = DefaultExceptionHandler()

    @Test
    fun `handleFormValidation - FieldError를 details로 변환`() {
        val fieldError = FieldError("form", "name", "rejected", false, null, null, "must not be blank")
        val ex = FormValidationException(listOf(fieldError))

        val response = handler.handleFormValidation(ex)

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        val body = response.body!!
        assertEquals(400, body.status)
        assertEquals(1, body.details.size)
        assertEquals("name", body.details[0].field)
        assertEquals("must not be blank", body.details[0].message)
        assertEquals("rejected", body.details[0].rejectedValue)
    }

    @Test
    fun `handleFormValidation - ObjectError는 objectName으로 매핑`() {
        val objectError = ObjectError("form", "invalid state")
        val ex = FormValidationException(listOf(objectError))

        val response = handler.handleFormValidation(ex)

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        val body = response.body!!
        assertEquals(1, body.details.size)
        assertEquals("form", body.details[0].field)
        assertEquals("invalid state", body.details[0].message)
    }

    @Test
    fun `handleConstraintViolation - ConstraintViolation을 details로 변환`() {
        val path: Path = mock()
        whenever(path.toString()).thenReturn("email")
        val violation: ConstraintViolation<Any> = mock()
        whenever(violation.propertyPath).thenReturn(path)
        whenever(violation.message).thenReturn("must be a valid email")
        whenever(violation.invalidValue).thenReturn("bad-email")
        val ex = ConstraintViolationException(setOf(violation))

        val response = handler.handleConstraintViolation(ex)

        assertEquals(HttpStatus.BAD_REQUEST, response.statusCode)
        val body = response.body!!
        assertEquals(400, body.status)
        assertEquals(1, body.details.size)
        assertEquals("email", body.details[0].field)
        assertEquals("must be a valid email", body.details[0].message)
        assertEquals("bad-email", body.details[0].rejectedValue)
    }

    @Test
    fun `handleEntityNotFound - 404 응답 반환`() {
        val ex = EntityNotFoundException("User not found")

        val response = handler.handleEntityNotFound(ex)

        assertEquals(HttpStatus.NOT_FOUND, response.statusCode)
        val body = response.body!!
        assertEquals(404, body.status)
        assertEquals("Not Found", body.error)
        assertEquals("User not found", body.message)
    }
}
