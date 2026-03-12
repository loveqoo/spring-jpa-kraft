package spring.kraft.controller.action

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.history.Revision
import org.springframework.data.history.Revisions
import spring.kraft.jpa.BaseEntity

interface RevisionEntityActionExtend<ID, E> : BaseEntityActionExtend<ID, E>
    where ID : Comparable<ID>, E : BaseEntity<ID> {
    fun <T : Any> revisions(
        id: ID,
        transformer: (E) -> T,
    ): Revisions<Int, T>

    fun <T : Any> revisionPages(
        id: ID,
        pageable: Pageable,
        transformer: (E) -> T,
    ): Page<Revision<Int, T>>
}
