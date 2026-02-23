package spring.kraft.controller

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.validation.Errors
import spring.kraft.controller.action.BaseEntityAction
import spring.kraft.controller.delegator.BaseEntityDelegator
import spring.kraft.controller.mapper.BaseEntityMapper
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.service.BaseEntityService
import java.io.Serializable

abstract class BaseEntityController<ID, E, S, D, CF, UF> :
    BaseEntityAction<ID, E, D, CF, UF>,
    BaseEntityMapper<ID, E, D>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          S : BaseEntityService<ID, E, CF, UF>,
          D : Serializable,
          CF : Any,
          UF : UpdateForm<ID> {
    abstract val service: S
    abstract val tableName: String
    protected open val delegator by lazy { BaseEntityDelegator(service, this) }

    override fun list(pageable: Pageable): Page<D> = delegator.list(pageable)

    override fun getOne(id: ID): D = delegator.getOne(id)

    override fun createOne(
        request: CF,
        errors: Errors,
    ): String = delegator.createOne(request, errors)

    override fun updateOne(
        request: UF,
        errors: Errors,
    ): String = delegator.updateOne(request, errors)

    override fun delete(id: ID): String = delegator.delete(id)

    override fun toCreateDto(entity: E): String = delegator.toCreateDto(entity, tableName)

    override fun toUpdateDto(entity: E): String = delegator.toUpdateDto(entity, tableName)

    override fun toDeleteDto(id: ID): String = delegator.toDeleteDto(id, tableName)
}
