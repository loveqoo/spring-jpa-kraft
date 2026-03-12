package spring.kraft.controller.action

import spring.kraft.controller.dto.MutationResponse
import spring.kraft.jpa.BaseEntity

interface BaseEntityActionExtend<ID, E> : ReadOnlyActionExtend<ID, E>
    where ID : Comparable<ID>, E : BaseEntity<ID> {
    fun toCreateDto(
        entity: E,
        entityName: String,
    ): MutationResponse

    fun toUpdateDto(
        entity: E,
        entityName: String,
    ): MutationResponse

    fun toDeleteDto(
        id: ID,
        entityName: String,
    ): MutationResponse
}
