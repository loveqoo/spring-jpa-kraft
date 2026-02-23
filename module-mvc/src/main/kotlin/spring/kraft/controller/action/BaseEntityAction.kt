package spring.kraft.controller.action

import org.springframework.validation.Errors
import spring.kraft.controller.dto.MutationResponse
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import java.io.Serializable

interface BaseEntityAction<ID, E, D, CF, UF> :
    ReadOnlyAction<ID, E, D>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          CF : Any,
          UF : UpdateForm<ID>,
          D : Serializable {
    fun createOne(
        request: CF,
        errors: Errors,
    ): MutationResponse

    fun updateOne(
        request: UF,
        errors: Errors,
    ): MutationResponse

    fun delete(id: ID): MutationResponse
}
