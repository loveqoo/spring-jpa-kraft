package spring.kraft.controller

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.history.Revision
import org.springframework.data.history.Revisions
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.repository.history.RevisionRepository
import spring.kraft.controller.action.RevisionEntityAction
import spring.kraft.controller.delegator.RevisionEntityDelegator
import spring.kraft.controller.mapper.RevisionEntityMapper
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.service.RevisionEntityService
import java.io.Serializable

abstract class RevisionEntityController<ID, E, R, S, D, CF, UF> :
    BaseEntityController<ID, E, S, D, CF, UF>(),
    RevisionEntityAction<ID, E, D, CF, UF>,
    RevisionEntityMapper<ID, E, D>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          R : JpaRepository<E, ID>,
          R : RevisionRepository<E, ID, Int>,
          S : RevisionEntityService<ID, E, R, CF, UF>,
          D : Serializable,
          CF : Any,
          UF : UpdateForm<ID> {
    abstract override val service: S
    override val delegator by lazy { RevisionEntityDelegator(service, this) }

    override fun revisions(id: ID): Revisions<Int, D> = delegator.revisions(id)

    override fun revisionPages(
        id: ID,
        pageable: Pageable,
    ): Page<Revision<Int, D>> = delegator.revisionPages(id, pageable)
}
