package spring.kraft.controller.delegator

import org.springframework.validation.Errors
import spring.kraft.controller.action.BaseEntityAction
import spring.kraft.controller.action.BaseEntityActionExtend
import spring.kraft.controller.dto.MutationResponse
import spring.kraft.controller.exception.FormValidationException
import spring.kraft.controller.mapper.BaseEntityMapper
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.service.BaseEntityService
import java.io.Serializable

open class BaseEntityDelegator<ID, E, S, D, CF : Any, UF : UpdateForm<ID>>(
    private val service: S,
    private val mapper: BaseEntityMapper<ID, E, D>,
) : ReadOnlyDelegator<ID, E, S, D>(service, mapper),
    BaseEntityAction<ID, E, D, CF, UF>,
    BaseEntityActionExtend<ID, E>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          S : BaseEntityService<ID, E, CF, UF>,
          D : Serializable {
    override fun createOne(
        request: CF,
        errors: Errors,
    ): MutationResponse {
        if (errors.hasErrors()) {
            throw FormValidationException(errors.allErrors)
        }
        return mapper.toCreateDto(service.create(request))
    }

    override fun updateOne(
        request: UF,
        errors: Errors,
    ): MutationResponse {
        if (errors.hasErrors()) {
            throw FormValidationException(errors.allErrors)
        }
        return mapper.toUpdateDto(service.update(request))
    }

    override fun delete(id: ID): MutationResponse {
        service.delete(id)
        return mapper.toDeleteDto(id)
    }

    override fun toCreateDto(
        entity: E,
        entityName: String,
    ): MutationResponse = MutationResponse.create(entity.id!!, entityName)

    override fun toUpdateDto(
        entity: E,
        entityName: String,
    ): MutationResponse = MutationResponse.update(entity.id!!, entityName)

    override fun toDeleteDto(
        id: ID,
        entityName: String,
    ): MutationResponse = MutationResponse.delete(id, entityName)
}
