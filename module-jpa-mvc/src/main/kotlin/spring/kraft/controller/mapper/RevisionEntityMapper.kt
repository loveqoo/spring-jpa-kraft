package spring.kraft.controller.mapper

import spring.kraft.jpa.BaseEntity
import java.io.Serializable

interface RevisionEntityMapper<ID, E, D> :
    BaseEntityMapper<ID, E, D>
    where ID : Comparable<ID>, E : BaseEntity<ID>, D : Serializable {
    fun toRevisionDto(entity: E): D
}
