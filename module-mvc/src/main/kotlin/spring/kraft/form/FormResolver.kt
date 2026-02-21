package spring.kraft.form

import jakarta.validation.ConstraintViolationException
import jakarta.validation.Validator
import org.springframework.data.jpa.repository.JpaRepository
import spring.kraft.core.flatMap
import spring.kraft.jpa.type.Identifiable

abstract class FormResolver<ID, E, CF, UF>
    where ID : Comparable<ID>,
          E : Identifiable<ID>,
          CF : Any,
          UF : UpdateForm<ID> {
    abstract val repo: JpaRepository<E, ID>
    abstract val validator: Validator

    fun CF.toEntity(): Result<E> = validateForm(this).flatMap { this.createEntity() }

    fun UF.toEntity(): Result<E> = validateForm(this).flatMap { this.resolveEntity() }

    protected abstract fun CF.createEntity(): Result<E>

    protected abstract fun UF.resolveEntity(): Result<E>

    open fun transform(entity: E): E = entity

    private fun validateForm(form: Any): Result<Unit> {
        val violations = validator.validate(form)
        return if (violations.isEmpty()) {
            Result.success(Unit)
        } else {
            Result.failure(ConstraintViolationException(violations))
        }
    }
}
