package spring.kraft.service

import org.springframework.data.jpa.repository.JpaRepository
import spring.kraft.jpa.AggregateRootBaseEntity
import spring.kraft.jpa.BaseEntity
import spring.kraft.jpa.type.AggregateRootAware
import spring.kraft.service.event.AggregateRootVersionUpEvent

interface AggregateRootAwareService<ID, E, RE>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          E : AggregateRootAware<ID, RE>,
          RE : AggregateRootBaseEntity<ID, RE> {
    val aggregateRootRepo: JpaRepository<RE, ID>
    val entityType: Class<E>

    fun publishEvent(entity: Any) {
        if (entityType.isInstance(entity)) {
            @Suppress("UNCHECKED_CAST")
            val aware = entity as E
            val root = aware.aggregateRoot()
            val rootId = root.id ?: return
            val sourceId = aware.id ?: return
            root.versionUp()
            root.addDomainEvent(
                AggregateRootVersionUpEvent(
                    aggregateRootId = rootId,
                    aggregateRootType = root::class.java,
                    sourceEntityId = sourceId,
                    sourceEntityType = entityType,
                ),
            )
            aggregateRootRepo.save(root)
        }
    }
}
