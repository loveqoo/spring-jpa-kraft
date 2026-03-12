package spring.kraft.controller.mapper

import spring.kraft.controller.dto.MutationResponse
import spring.kraft.jpa.BaseEntity
import java.io.Serializable

interface BaseEntityMapper<ID, E, D> : ReadOnlyMapper<ID, E, D>
    where ID : Comparable<ID>, E : BaseEntity<ID>, D : Serializable {
    fun toCreateDto(entity: E): MutationResponse

    fun toUpdateDto(entity: E): MutationResponse

    fun toDeleteDto(id: ID): MutationResponse
}
