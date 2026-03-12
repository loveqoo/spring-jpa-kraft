package spring.kraft.service

import org.springframework.transaction.annotation.Transactional
import spring.kraft.form.FormResolver
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.jpa.type.AggregateRootAware
import spring.kraft.jpa.type.Checkable

interface BaseEntityService<ID, E, in CF, in UF> :
    ReadOnlyEntityService<ID, E>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          CF : Any,
          UF : UpdateForm<ID> {
    val formResolver: FormResolver<ID, E, CF, UF>
    val aggregateRootAwareServices: List<AggregateRootAwareService<*, *, *>>
        get() = emptyList()

    @Transactional
    fun create(request: CF): E =
        formResolver
            .run { request.toEntity() }
            .mapCatching { entity ->
                repo.save(entity)
                if (entity is Checkable) {
                    entity.check()
                }
                afterSave(entity)
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
                afterSave(entity)
                entity
            }.getOrThrow()

    @Transactional
    fun delete(id: ID) {
        beforeDelete(id)
        repo.deleteById(id)
    }

    fun afterSave(entity: E) {
        if (entity is AggregateRootAware<*, *>) {
            aggregateRootAwareServices.forEach { it.publishEvent(entity) }
        }
    }

    fun beforeDelete(id: ID) {
        if (aggregateRootAwareServices.isEmpty()) return
        val entity = repo.findById(id).orElse(null) ?: return
        if (entity is AggregateRootAware<*, *>) {
            aggregateRootAwareServices.forEach { it.publishEvent(entity) }
        }
    }
}
