package spring.kraft.service

import org.springframework.transaction.annotation.Transactional
import spring.kraft.form.FormResolver
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.jpa.type.Checkable

interface BaseEntityService<ID, E, in CF, in UF> :
    ReadOnlyService<ID, E>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          CF : Any,
          UF : UpdateForm<ID> {
    val formResolver: FormResolver<ID, E, CF, UF>

    @Transactional
    fun create(request: CF): E =
        formResolver
            .run { request.toEntity() }
            .mapCatching { entity ->
                repo.save(entity)
                if (entity is Checkable) {
                    entity.check()
                }
                entity
            }.getOrThrow()

    @Transactional
    fun update(request: UF): E =
        formResolver
            .run { request.toEntity() }
            .mapCatching { entity ->
                repo.save(entity)
                if (entity is Checkable) {
                    entity.check()
                }
                entity
            }.getOrThrow()

    @Transactional
    fun delete(id: ID) = repo.deleteById(id)
}
