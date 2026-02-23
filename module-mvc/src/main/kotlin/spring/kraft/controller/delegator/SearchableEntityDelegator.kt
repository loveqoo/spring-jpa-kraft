package spring.kraft.controller.delegator

import com.querydsl.core.types.Predicate
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.querydsl.QuerydslPredicateExecutor
import spring.kraft.controller.action.SearchableEntityAction
import spring.kraft.controller.action.SearchableEntityActionExtend
import spring.kraft.controller.mapper.BaseEntityMapper
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.jpa.repo.DynamicSearchRepository
import spring.kraft.service.SearchableEntityService
import java.io.Serializable

open class SearchableEntityDelegator<ID, E, R, S, D, CF : Any, UF : UpdateForm<ID>>(
    private val service: S,
    private val mapper: BaseEntityMapper<ID, E, D>,
) : BaseEntityDelegator<ID, E, S, D, CF, UF>(service, mapper),
    SearchableEntityAction<ID, E, D, CF, UF>,
    SearchableEntityActionExtend<ID, E>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          R : JpaRepository<E, ID>,
          R : QuerydslPredicateExecutor<E>,
          R : DynamicSearchRepository<ID, E>,
          S : SearchableEntityService<ID, E, R, CF, UF>,
          D : Serializable {
    override fun search(
        pageable: Pageable,
        predicate: Predicate?,
    ): Page<D> = search(pageable, predicate, mapper::toReadDto)

    override fun <T : Any> search(
        pageable: Pageable,
        predicate: Predicate?,
        transformer: (E) -> T,
    ): Page<T> =
        if (predicate != null) {
            service.search(predicate, pageable, transformer)
        } else {
            service.findAll(pageable, transformer)
        }

    override fun search(
        pageable: Pageable,
        customParams: Map<String, String>,
    ): Page<D> = search(pageable, customParams, mapper::toReadDto)

    override fun <T : Any> search(
        pageable: Pageable,
        customParams: Map<String, String>,
        transformer: (E) -> T,
    ): Page<T> = service.searchCustom(customParams, pageable, transformer)
}
