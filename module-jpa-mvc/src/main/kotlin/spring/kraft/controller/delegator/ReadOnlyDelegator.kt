package spring.kraft.controller.delegator

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import spring.kraft.controller.action.ReadOnlyAction
import spring.kraft.controller.action.ReadOnlyActionExtend
import spring.kraft.controller.mapper.ReadOnlyMapper
import spring.kraft.jpa.BaseEntity
import spring.kraft.service.ReadOnlyEntityService
import java.io.Serializable

open class ReadOnlyDelegator<ID, E, S, D>(
    private val service: S,
    private val mapper: ReadOnlyMapper<ID, E, D>,
) : ReadOnlyAction<ID, E, D>,
    ReadOnlyActionExtend<ID, E>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          S : ReadOnlyEntityService<ID, E>,
          D : Serializable {
    override fun list(pageable: Pageable): Page<D> = this.list(pageable, mapper::toReadDto)

    override fun <T : Any> list(
        pageable: Pageable,
        transformer: (E) -> T,
    ): Page<T> = this.service.findAll(pageable, transformer)

    override fun getOne(id: ID): D = this.getOne(id, mapper::toReadDto)

    override fun <T : Any> getOne(
        id: ID,
        transformer: (E) -> T,
    ): T = this.service.getOne(id, transformer)
}
