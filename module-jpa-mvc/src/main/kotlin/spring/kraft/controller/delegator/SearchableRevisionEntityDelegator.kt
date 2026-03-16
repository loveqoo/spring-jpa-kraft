package spring.kraft.controller.delegator

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.history.Revision
import org.springframework.data.history.Revisions
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.repository.history.RevisionRepository
import spring.kraft.controller.action.SearchableRevisionEntityAction
import spring.kraft.controller.action.SearchableRevisionEntityActionExtend
import spring.kraft.controller.mapper.RevisionEntityMapper
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.service.SearchableRevisionEntityService
import java.io.Serializable

open class SearchableRevisionEntityDelegator<ID, E, R, S, D, in CF : Any, in UF : UpdateForm<ID>>(
    private val service: S,
    private val mapper: RevisionEntityMapper<ID, E, D>,
) : SearchableEntityDelegator<ID, E, R, S, D, CF, UF>(service, mapper),
    SearchableRevisionEntityAction<ID, E, D, CF, UF>,
    SearchableRevisionEntityActionExtend<ID, E>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          R : JpaRepository<E, ID>,
          R : JpaSpecificationExecutor<E>,
          R : RevisionRepository<E, ID, Int>,
          S : SearchableRevisionEntityService<ID, E, R, CF, UF>,
          D : Serializable {
    override fun revisions(id: ID): Revisions<Int, D> = revisions(id, mapper::toRevisionDto)

    override fun <T : Any> revisions(
        id: ID,
        transformer: (E) -> T,
    ): Revisions<Int, T> = service.findRevisions(id, transformer)

    override fun revisionPages(
        id: ID,
        pageable: Pageable,
    ): Page<Revision<Int, D>> = revisionPages(id, pageable, mapper::toRevisionDto)

    override fun <T : Any> revisionPages(
        id: ID,
        pageable: Pageable,
        transformer: (E) -> T,
    ): Page<Revision<Int, T>> = service.findRevisionPages(id, pageable, transformer)
}
