package spring.kraft.form

import org.springframework.data.jpa.repository.JpaRepository
import spring.kraft.core.flatMap
import spring.kraft.jpa.type.Identifiable
import spring.kraft.jpa.type.unproxy

abstract class FormResolver1<ID, E, in CF, in UF, P1_ID, P1> :
    FormResolver<ID, E, CF, UF>()
    where ID : Comparable<ID>,
          E : Identifiable<ID>,
          CF : Any,
          UF : UpdateForm<ID>,
          P1_ID : Comparable<P1_ID>,
          P1 : Identifiable<P1_ID> {
    abstract val repo1: JpaRepository<P1, P1_ID>

    abstract fun CF.parentId(): Result<P1_ID>

    abstract fun CF.toEntity(p1: P1): Result<E>

    abstract fun UF.parentId(): Result<P1_ID?>

    abstract fun UF.update(
        entity: E,
        parent: P1?,
    ): Result<Unit>

    private fun CF.parent(): Result<P1> =
        this.parentId().flatMap {
            runCatching { repo1.getReferenceById(it).unproxy() }
        }

    override fun CF.createEntity(): Result<E> = this.parent().flatMap { this.toEntity(it) }

    override fun UF.resolveEntity(): Result<E> =
        runCatching {
            val entity = repo.getReferenceById(this.id).unproxy()
            require(this.id == entity.id)
            transform(entity)
        }.flatMap { entity ->
            this
                .parentId()
                .flatMap { p1 ->
                    runCatching { p1?.let { repo1.getReferenceById(it).unproxy() } }
                }.flatMap { parent ->
                    this.update(entity, parent).map { entity }
                }
        }
}
