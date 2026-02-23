package spring.kraft.controller

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import spring.kraft.controller.action.ReadOnlyAction
import spring.kraft.controller.delegator.ReadOnlyDelegator
import spring.kraft.controller.mapper.ReadOnlyMapper
import spring.kraft.jpa.BaseEntity
import spring.kraft.service.ReadOnlyEntityService
import java.io.Serializable

abstract class ReadOnlyEntityController<ID, E, S, D> :
    ReadOnlyAction<ID, E, D>,
    ReadOnlyMapper<ID, E, D>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          S : ReadOnlyEntityService<ID, E>,
          D : Serializable {
    abstract val service: S
    protected open val delegator by lazy { ReadOnlyDelegator(service, this) }

    override fun list(pageable: Pageable): Page<D> = delegator.list(pageable)

    override fun getOne(id: ID): D = delegator.getOne(id)
}
