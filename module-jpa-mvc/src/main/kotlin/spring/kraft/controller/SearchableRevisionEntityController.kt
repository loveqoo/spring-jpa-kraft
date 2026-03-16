package spring.kraft.controller

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.history.Revision
import org.springframework.data.history.Revisions
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.data.repository.history.RevisionRepository
import spring.kraft.controller.action.SearchableRevisionEntityAction
import spring.kraft.controller.delegator.SearchableRevisionEntityDelegator
import spring.kraft.controller.mapper.RevisionEntityMapper
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.service.SearchableRevisionEntityService
import java.io.Serializable

abstract class SearchableRevisionEntityController<ID, E, R, S, D, CF, UF> :
    SearchableEntityController<ID, E, R, S, D, CF, UF>(),
    SearchableRevisionEntityAction<ID, E, D, CF, UF>,
    RevisionEntityMapper<ID, E, D>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          R : JpaRepository<E, ID>,
          R : JpaSpecificationExecutor<E>,
          R : RevisionRepository<E, ID, Int>,
          S : SearchableRevisionEntityService<ID, E, R, CF, UF>,
          D : Serializable,
          CF : Any,
          UF : UpdateForm<ID> {
    abstract override val service: S
    override val delegator by lazy { SearchableRevisionEntityDelegator(service, this) }

    override fun revisions(id: ID): Revisions<Int, D> = delegator.revisions(id)

    override fun revisionPages(
        id: ID,
        pageable: Pageable,
    ): Page<Revision<Int, D>> = delegator.revisionPages(id, pageable)
}
