package spring.kraft.controller

import org.springframework.validation.Errors
import spring.kraft.controller.action.BaseEntityAction
import spring.kraft.controller.delegator.BaseEntityDelegator
import spring.kraft.controller.dto.MutationResponse
import spring.kraft.controller.mapper.BaseEntityMapper
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.service.BaseEntityService
import java.io.Serializable

abstract class BaseEntityController<ID, E, S, D, CF, UF> :
    ReadOnlyEntityController<ID, E, S, D>(),
    BaseEntityAction<ID, E, D, CF, UF>,
    BaseEntityMapper<ID, E, D>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          S : BaseEntityService<ID, E, CF, UF>,
          D : Serializable,
          CF : Any,
          UF : UpdateForm<ID> {
    abstract override val service: S
    abstract val tableName: String
    override val delegator by lazy { BaseEntityDelegator(service, this) }

    override fun createOne(
        request: CF,
        errors: Errors,
    ): MutationResponse = delegator.createOne(request, errors)

    override fun updateOne(
        request: UF,
        errors: Errors,
    ): MutationResponse = delegator.updateOne(request, errors)

    override fun delete(id: ID): MutationResponse = delegator.delete(id)

    override fun toCreateDto(entity: E): MutationResponse = delegator.toCreateDto(entity, tableName)

    override fun toUpdateDto(entity: E): MutationResponse = delegator.toUpdateDto(entity, tableName)

    override fun toDeleteDto(id: ID): MutationResponse = delegator.toDeleteDto(id, tableName)
}
