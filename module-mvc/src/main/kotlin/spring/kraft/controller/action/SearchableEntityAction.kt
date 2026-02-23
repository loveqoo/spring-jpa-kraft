package spring.kraft.controller.action

import com.querydsl.core.types.Predicate
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
    fun search(
        pageable: Pageable,
        predicate: Predicate?,
    ): Page<D>

    fun search(
        pageable: Pageable,
        customParams: Map<String, String>,
    ): Page<D>
}
