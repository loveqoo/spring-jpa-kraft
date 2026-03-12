package spring.kraft.jpa

import jakarta.persistence.Column
import jakarta.persistence.MappedSuperclass
import jakarta.persistence.Transient
import jakarta.persistence.Version
import org.springframework.data.domain.AfterDomainEventPublication
import org.springframework.data.domain.DomainEvents
import spring.kraft.jpa.type.OptimisticLockSupport
import spring.kraft.jpa.type.SoftDeletable
import java.time.LocalDateTime
import java.util.Collections

@MappedSuperclass
abstract class AggregateRootBaseEntity<ID : Comparable<ID>, A : AggregateRootBaseEntity<ID, A>> :
    BaseEntity<ID>(),
    OptimisticLockSupport,
    SoftDeletable {
    @Transient
    private val _domainEvents: MutableList<Any> = mutableListOf()

    @Version
    @Column(name = OptimisticLockSupport.Columns.VersionNumber.NAME)
    override var versionNumber: Long = 0

    @Column(name = SoftDeletable.Columns.Deleted.NAME)
    override var deleted: Boolean = false

    override fun versionUp() {
        updatedAt = LocalDateTime.now()
    }

    override fun delete() {
        deleted = true
    }

    @DomainEvents
    @Transient
    fun domainEvents(): Collection<Any> = Collections.unmodifiableList(_domainEvents)

    @AfterDomainEventPublication
    @Transient
    fun clearDomainEvents() {
        _domainEvents.clear()
    }

    @Transient
    fun addDomainEvent(event: Any) {
        _domainEvents.add(event)
    }

    @Transient
    fun getDomainEvents(): Collection<Any> = domainEvents()
}
