package spring.kraft.form

import org.springframework.data.jpa.repository.JpaRepository
import spring.kraft.core.flatMap
import spring.kraft.core.zipLazy
import spring.kraft.jpa.type.Identifiable
import spring.kraft.jpa.type.unproxy

abstract class FormResolver2<ID, E, in CF, in UF, P1_ID, P1, P2_ID, P2> :
    FormResolver<ID, E, CF, UF>()
    where ID : Comparable<ID>,
          E : Identifiable<ID>,
          CF : Any,
          UF : UpdateForm<ID>,
          P1_ID : Comparable<P1_ID>,
          P1 : Identifiable<P1_ID>,
          P2_ID : Comparable<P2_ID>,
          P2 : Identifiable<P2_ID> {
    abstract val repo1: JpaRepository<P1, P1_ID>
    abstract val repo2: JpaRepository<P2, P2_ID>

    abstract fun CF.parentId1(): Result<P1_ID>

    abstract fun CF.parentId2(): Result<P2_ID>

    abstract fun CF.toEntity(
        p1: P1,
        p2: P2,
    ): Result<E>

    abstract fun UF.parentId1(): Result<P1_ID?>

    abstract fun UF.parentId2(): Result<P2_ID?>

    abstract fun UF.update(
        entity: E,
        parent1: P1?,
        parent2: P2?,
    ): Result<Unit>

    private fun CF.parent1(): Result<P1> =
        this.parentId1().flatMap {
            runCatching { repo1.getReferenceById(it).unproxy() }
        }

    private fun CF.parent2(): Result<P2> =
        this.parentId2().flatMap {
            runCatching { repo2.getReferenceById(it).unproxy() }
        }

    override fun CF.createEntity(): Result<E> =
        this
            .parent1()
            .zipLazy({ this.parent2() }) { p1, p2 ->
                this.toEntity(p1, p2)
            }.flatMap { it }

    override fun UF.resolveEntity(): Result<E> =
        runCatching {
            val entity = repo.getReferenceById(this.id).unproxy()
            require(this.id == entity.id)
            transform(entity)
        }.zipLazy(
            {
                this.parentId1().flatMap { p1 ->
                    runCatching { p1?.let { repo1.getReferenceById(it).unproxy() } }
                }
            },
            {
                this.parentId2().flatMap { p2 ->
                    runCatching { p2?.let { repo2.getReferenceById(it).unproxy() } }
                }
            },
        ) { entity, parent1, parent2 ->
            this.update(entity, parent1, parent2).map { entity }
        }.flatMap { it }
}
