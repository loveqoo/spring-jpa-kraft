package spring.kraft.controller.action

import io.swagger.v3.oas.annotations.Operation
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.history.Revision
import org.springframework.data.history.Revisions
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import java.io.Serializable

interface RevisionEntityAction<ID, E, D, in CF, in UF> :
    BaseEntityAction<ID, E, D, CF, UF>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          CF : Any,
          UF : UpdateForm<ID>,
          D : Serializable {
    @Operation(summary = "리비전 조회", description = "엔티티의 전체 리비전 이력을 조회합니다.")
    fun revisions(id: ID): Revisions<Int, D>

    @Operation(summary = "리비전 페이지 조회", description = "엔티티의 리비전 이력을 페이지네이션으로 조회합니다.")
    fun revisionPages(
        id: ID,
        pageable: Pageable,
    ): Page<Revision<Int, D>>
}
