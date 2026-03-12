package spring.kraft.controller.action

import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import java.io.Serializable

interface SearchableRevisionEntityAction<ID, E, D, CF, UF> :
    SearchableEntityAction<ID, E, D, CF, UF>,
    RevisionEntityAction<ID, E, D, CF, UF>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          CF : Any,
          UF : UpdateForm<ID>,
          D : Serializable
