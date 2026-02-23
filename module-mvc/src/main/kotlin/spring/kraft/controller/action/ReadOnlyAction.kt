package spring.kraft.controller.action

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import spring.kraft.jpa.BaseEntity
import java.io.Serializable

interface ReadOnlyAction<ID, E, D>
    where ID : Comparable<ID>, E : BaseEntity<ID>, D : Serializable {
    fun list(pageable: Pageable): Page<D>

    fun getOne(id: ID): D
}
