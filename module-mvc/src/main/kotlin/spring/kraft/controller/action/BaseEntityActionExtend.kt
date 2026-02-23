package spring.kraft.controller.action

import spring.kraft.jpa.BaseEntity

interface BaseEntityActionExtend<ID, E> : ReadOnlyActionExtend<ID, E>
    where ID : Comparable<ID>, E : BaseEntity<ID> {
    fun toCreateDto(
        entity: E,
        entityName: String,
    ): String

    fun toUpdateDto(
        entity: E,
        entityName: String,
    ): String

    fun toDeleteDto(
        id: ID,
        entityName: String,
    ): String
}
