package spring.kraft.controller.action

import io.swagger.v3.oas.annotations.Operation
import org.springframework.validation.Errors
import spring.kraft.controller.dto.MutationResponse
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import java.io.Serializable

interface BaseEntityAction<ID, E, D, in CF, in UF> :
    ReadOnlyAction<ID, E, D>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          CF : Any,
          UF : UpdateForm<ID>,
          D : Serializable {
    @Operation(summary = "생성", description = "새로운 엔티티를 생성합니다.")
    fun createOne(
        request: CF,
        errors: Errors,
    ): MutationResponse

    @Operation(summary = "수정", description = "기존 엔티티를 수정합니다.")
    fun updateOne(
        request: UF,
        errors: Errors,
    ): MutationResponse

    @Operation(summary = "삭제", description = "ID로 엔티티를 삭제합니다.")
    fun delete(id: ID): MutationResponse
}
