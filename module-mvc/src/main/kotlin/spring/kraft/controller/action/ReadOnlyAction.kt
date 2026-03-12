package spring.kraft.controller.action

import io.swagger.v3.oas.annotations.Operation
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import spring.kraft.jpa.BaseEntity
import java.io.Serializable

interface ReadOnlyAction<ID, E, D>
    where ID : Comparable<ID>, E : BaseEntity<ID>, D : Serializable {
    @Operation(summary = "목록 조회", description = "페이지네이션을 적용하여 목록을 조회합니다.")
    fun list(pageable: Pageable): Page<D>

    @Operation(summary = "단건 조회", description = "ID로 단건을 조회합니다.")
    fun getOne(id: ID): D
}
