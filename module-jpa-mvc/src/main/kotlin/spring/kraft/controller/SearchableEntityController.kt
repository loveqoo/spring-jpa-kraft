package spring.kraft.controller

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import spring.kraft.controller.action.SearchableEntityAction
import spring.kraft.controller.delegator.SearchableEntityDelegator
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.service.SearchableEntityService
import java.io.Serializable

abstract class SearchableEntityController<ID, E, R, S, D, CF, UF> :
    BaseEntityController<ID, E, S, D, CF, UF>(),
    SearchableEntityAction<ID, E, D, CF, UF>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          R : JpaRepository<E, ID>,
          R : JpaSpecificationExecutor<E>,
          S : SearchableEntityService<ID, E, R, CF, UF>,
          D : Serializable,
          CF : Any,
          UF : UpdateForm<ID> {
    abstract override val service: S
    override val delegator by lazy { SearchableEntityDelegator(service, this) }

    override fun search(
        pageable: Pageable,
        params: Map<String, List<String>>,
    ): Page<D> = delegator.search(pageable, params)
}
