package spring.kraft.controller.action

import com.querydsl.core.types.Predicate
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import spring.kraft.jpa.BaseEntity

interface SearchableEntityActionExtend<ID, E> : BaseEntityActionExtend<ID, E>
    where ID : Comparable<ID>, E : BaseEntity<ID> {
    fun <T : Any> search(
        pageable: Pageable,
        predicate: Predicate?,
        transformer: (E) -> T,
    ): Page<T>

    fun <T : Any> search(
        pageable: Pageable,
        customParams: Map<String, String>,
        transformer: (E) -> T,
    ): Page<T>
}
