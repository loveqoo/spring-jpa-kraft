package spring.kraft.controller.exception

import jakarta.validation.ValidationException
import org.springframework.validation.ObjectError

class FormValidationException(
    val errors: List<ObjectError>,
) : ValidationException("Form validation failed")
