package spring.kraft.controller.mapper

import spring.kraft.jpa.BaseEntity
import java.io.Serializable

interface ReadOnlyMapper<ID, E, D>
    where ID : Comparable<ID>, E : BaseEntity<ID>, D : Serializable {
    fun toReadDto(entity: E): D
}
