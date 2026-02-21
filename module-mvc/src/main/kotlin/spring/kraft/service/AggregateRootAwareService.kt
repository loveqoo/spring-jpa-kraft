package spring.kraft.service

import org.springframework.data.jpa.repository.JpaRepository
import spring.kraft.jpa.AggregateRootBaseEntity
import spring.kraft.jpa.BaseEntity
import spring.kraft.jpa.type.AggregateRootAware

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
            aggregateRootRepo.save(aware.aggregateRoot())
        }
    }
}
