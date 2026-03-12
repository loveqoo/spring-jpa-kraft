package spring.kraft.controller.action

import io.swagger.v3.oas.annotations.Operation
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import java.io.Serializable

interface SearchableEntityAction<ID, E, D, CF, UF> :
    BaseEntityAction<ID, E, D, CF, UF>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          CF : Any,
          UF : UpdateForm<ID>,
          D : Serializable {
    @Operation(summary = "검색", description = "검색 조건을 적용하여 목록을 조회합니다.")
    fun search(
        pageable: Pageable,
        params: Map<String, List<String>>,
    ): Page<D>
}
