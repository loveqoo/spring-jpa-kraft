package spring.kraft.controller.action

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import spring.kraft.jpa.BaseEntity

interface ReadOnlyActionExtend<ID, E>
    where ID : Comparable<ID>, E : BaseEntity<ID> {
    fun <T : Any> list(
        pageable: Pageable,
        transformer: (E) -> T,
    ): Page<T>

    fun <T : Any> getOne(
        id: ID,
        transformer: (E) -> T,
    ): T
}
