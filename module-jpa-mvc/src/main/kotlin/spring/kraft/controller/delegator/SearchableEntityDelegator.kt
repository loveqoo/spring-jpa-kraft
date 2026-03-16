package spring.kraft.controller.delegator

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import spring.kraft.controller.action.SearchableEntityAction
import spring.kraft.controller.action.SearchableEntityActionExtend
import spring.kraft.controller.mapper.BaseEntityMapper
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.service.SearchableEntityService
import java.io.Serializable

open class SearchableEntityDelegator<ID, E, R, S, D, in CF : Any, in UF : UpdateForm<ID>>(
    private val service: S,
    private val mapper: BaseEntityMapper<ID, E, D>,
) : BaseEntityDelegator<ID, E, S, D, CF, UF>(service, mapper),
    SearchableEntityAction<ID, E, D, CF, UF>,
    SearchableEntityActionExtend<ID, E>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          R : JpaRepository<E, ID>,
          R : JpaSpecificationExecutor<E>,
          S : SearchableEntityService<ID, E, R, CF, UF>,
          D : Serializable {
    override fun search(
        pageable: Pageable,
        params: Map<String, List<String>>,
    ): Page<D> = search(pageable, params, mapper::toReadDto)

    override fun <T : Any> search(
        pageable: Pageable,
        params: Map<String, List<String>>,
        transformer: (E) -> T,
    ): Page<T> = service.search(params, pageable, transformer)
}
