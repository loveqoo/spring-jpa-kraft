package spring.kraft.controller.action

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import spring.kraft.jpa.BaseEntity

interface SearchableEntityActionExtend<ID, E> : BaseEntityActionExtend<ID, E>
    where ID : Comparable<ID>, E : BaseEntity<ID> {
    fun <T : Any> search(
        pageable: Pageable,
        params: Map<String, List<String>>,
        transformer: (E) -> T,
    ): Page<T>
}
