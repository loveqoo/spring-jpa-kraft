package spring.kraft.controller.action

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.history.Revision
import org.springframework.data.history.Revisions
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import java.io.Serializable

interface RevisionEntityAction<ID, E, D, CF, UF> :
    BaseEntityAction<ID, E, D, CF, UF>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          CF : Any,
          UF : UpdateForm<ID>,
          D : Serializable {
    fun revisions(id: ID): Revisions<Int, D>

    fun revisionPages(
        id: ID,
        pageable: Pageable,
    ): Page<Revision<Int, D>>
}
