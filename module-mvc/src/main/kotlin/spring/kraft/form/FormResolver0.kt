package spring.kraft.form

import spring.kraft.core.flatMap
import spring.kraft.jpa.type.Identifiable
import spring.kraft.jpa.type.unproxy

abstract class FormResolver0<ID, E, CF, UF> :
    FormResolver<ID, E, CF, UF>()
    where ID : Comparable<ID>,
          E : Identifiable<ID>,
          CF : Any,
          UF : UpdateForm<ID> {
    abstract fun UF.modify(entity: E): Result<Unit>

    override fun UF.resolveEntity(): Result<E> =
        runCatching {
            val entity = repo.getReferenceById(this.id).unproxy()
            require(this.id == entity.id)
            transform(entity)
        }.flatMap { entity -> modify(entity).map { entity } }
}
