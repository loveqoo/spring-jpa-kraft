package spring.kraft.controller.mapper

import spring.kraft.jpa.BaseEntity
import java.io.Serializable

interface BaseEntityMapper<ID, E, D> : ReadOnlyMapper<ID, E, D>
    where ID : Comparable<ID>, E : BaseEntity<ID>, D : Serializable {
    fun toCreateDto(entity: E): String

    fun toUpdateDto(entity: E): String

    fun toDeleteDto(id: ID): String
}
