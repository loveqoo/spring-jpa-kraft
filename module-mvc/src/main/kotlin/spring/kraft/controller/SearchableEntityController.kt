package spring.kraft.controller

import com.querydsl.core.types.Predicate
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.querydsl.QuerydslPredicateExecutor
import spring.kraft.controller.action.SearchableEntityAction
import spring.kraft.controller.delegator.SearchableEntityDelegator
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.jpa.repo.DynamicSearchRepository
import spring.kraft.service.SearchableEntityService
import java.io.Serializable

abstract class SearchableEntityController<ID, E, R, S, D, CF, UF> :
    BaseEntityController<ID, E, S, D, CF, UF>(),
    SearchableEntityAction<ID, E, D, CF, UF>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          R : JpaRepository<E, ID>,
          R : QuerydslPredicateExecutor<E>,
          R : DynamicSearchRepository<ID, E>,
          S : SearchableEntityService<ID, E, R, CF, UF>,
          D : Serializable,
          CF : Any,
          UF : UpdateForm<ID> {
    override val delegator by lazy { SearchableEntityDelegator<ID, E, R, S, D, CF, UF>(service, this) }

    override fun search(
        pageable: Pageable,
        predicate: Predicate?,
    ): Page<D> = delegator.search(pageable, predicate)

    override fun search(
        pageable: Pageable,
        customParams: Map<String, String>,
    ): Page<D> = delegator.search(pageable, customParams)
}
