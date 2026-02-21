package spring.kraft.jpa

import jakarta.persistence.Column
import jakarta.persistence.EntityListeners
import jakarta.persistence.MappedSuperclass
import jakarta.persistence.Version
import org.hibernate.Hibernate
import org.springframework.data.annotation.CreatedBy
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.LastModifiedBy
import org.springframework.data.annotation.LastModifiedDate
import org.springframework.data.domain.AbstractAggregateRoot
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import spring.kraft.jpa.type.Identifiable
import spring.kraft.jpa.type.OptimisticLockSupport
import spring.kraft.jpa.type.SoftDeletable
import spring.kraft.jpa.type.Traceable
import java.time.LocalDateTime

@EntityListeners(AuditingEntityListener::class)
@MappedSuperclass
abstract class AggregateRootBaseEntity<A : AggregateRootBaseEntity<A, ID>, ID : Comparable<ID>> :
    AbstractAggregateRoot<A>(),
    Identifiable<ID>,
    Traceable,
    OptimisticLockSupport,
    SoftDeletable {
    override val isNew: Boolean
        get() = id == null

    @CreatedDate
    @Column(name = Traceable.Columns.CreatedAt.NAME, updatable = false)
    override var createdAt: LocalDateTime? = null

    @CreatedBy
    @Column(name = Traceable.Columns.CreatedBy.NAME, length = Traceable.Columns.CreatedBy.LENGTH, updatable = false)
    override var createdBy: String? = null

    @LastModifiedDate
    @Column(name = Traceable.Columns.UpdatedAt.NAME)
    override var updatedAt: LocalDateTime? = null

    @LastModifiedBy
    @Column(name = Traceable.Columns.UpdatedBy.NAME, length = Traceable.Columns.UpdatedBy.LENGTH)
    override var updatedBy: String? = null

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

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null) return false
        if (Hibernate.getClass(this) != Hibernate.getClass(other)) return false
        other as AggregateRootBaseEntity<*, *>
        return if (isNew != other.isNew) {
            false
        } else if (!isNew) {
            id == other.id
        } else {
            EntityHelper.transientEquals(this, other)
        }
    }

    override fun hashCode(): Int =
        if (!isNew) {
            id.hashCode()
        } else {
            EntityHelper.transientHashCode(this)
        }
}
