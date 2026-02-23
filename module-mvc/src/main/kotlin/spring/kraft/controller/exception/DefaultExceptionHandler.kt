package spring.kraft.controller.exception

import jakarta.persistence.EntityNotFoundException
import jakarta.validation.ConstraintViolationException
import org.springframework.core.Ordered
import org.springframework.core.annotation.Order
import org.springframework.http.HttpStatus
import org.springframework.http.ResponseEntity
import org.springframework.validation.FieldError
import org.springframework.web.bind.annotation.ControllerAdvice
import org.springframework.web.bind.annotation.ExceptionHandler

@ControllerAdvice
@Order(Ordered.LOWEST_PRECEDENCE)
class DefaultExceptionHandler {
    @ExceptionHandler(FormValidationException::class)
    fun handleFormValidation(ex: FormValidationException): ResponseEntity<ErrorResponse> {
        val details =
            ex.errors.map { error ->
                when (error) {
                    is FieldError ->
                        FieldErrorDetail(
                            field = error.field,
                            message = error.defaultMessage ?: "",
                            rejectedValue = error.rejectedValue,
                        )
                    else ->
                        FieldErrorDetail(
                            field = error.objectName,
                            message = error.defaultMessage ?: "",
                        )
                }
            }
        val body =
            ErrorResponse(
                status = HttpStatus.BAD_REQUEST.value(),
                error = HttpStatus.BAD_REQUEST.reasonPhrase,
                message = "Form validation failed",
                details = details,
            )
        return ResponseEntity.badRequest().body(body)
    }

    @ExceptionHandler(ConstraintViolationException::class)
    fun handleConstraintViolation(ex: ConstraintViolationException): ResponseEntity<ErrorResponse> {
        val details =
            ex.constraintViolations.map { violation ->
                FieldErrorDetail(
                    field = violation.propertyPath.toString(),
                    message = violation.message,
                    rejectedValue = violation.invalidValue,
                )
            }
        val body =
            ErrorResponse(
                status = HttpStatus.BAD_REQUEST.value(),
                error = HttpStatus.BAD_REQUEST.reasonPhrase,
                message = "Constraint violation",
                details = details,
            )
        return ResponseEntity.badRequest().body(body)
    }

    @ExceptionHandler(EntityNotFoundException::class)
    fun handleEntityNotFound(ex: EntityNotFoundException): ResponseEntity<ErrorResponse> {
        val body =
            ErrorResponse(
                status = HttpStatus.NOT_FOUND.value(),
                error = HttpStatus.NOT_FOUND.reasonPhrase,
                message = ex.message ?: "Entity not found",
            )
        return ResponseEntity.status(HttpStatus.NOT_FOUND).body(body)
    }
}
