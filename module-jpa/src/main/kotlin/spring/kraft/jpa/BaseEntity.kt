package spring.kraft.jpa

import jakarta.persistence.Column
import jakarta.persistence.EntityListeners
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.MappedSuperclass
import org.hibernate.Hibernate
import org.springframework.data.annotation.CreatedBy
import org.springframework.data.annotation.CreatedDate
import org.springframework.data.annotation.LastModifiedBy
import org.springframework.data.annotation.LastModifiedDate
import org.springframework.data.jpa.domain.support.AuditingEntityListener
import java.time.LocalDateTime

@EntityListeners(AuditingEntityListener::class)
@MappedSuperclass
abstract class BaseEntity : Identifiable {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    override var id: Long? = null

    override val isNew: Boolean
        get() = id == null

    @CreatedDate
    @Column(name = Identifiable.CREATED_AT, updatable = false)
    override var createdAt: LocalDateTime? = null

    @CreatedBy
    @Column(name = Identifiable.CREATED_BY, updatable = false)
    override var createdBy: String? = null

    @LastModifiedDate
    @Column(name = Identifiable.UPDATED_AT)
    override var updatedAt: LocalDateTime? = null

    @LastModifiedBy
    @Column(name = Identifiable.UPDATED_BY)
    override var updatedBy: String? = null

    override fun equals(other: Any?): Boolean {
        if (this === other) return true
        if (other == null) return false
        if (Hibernate.getClass(this) != Hibernate.getClass(other)) return false
        other as BaseEntity
        return if (!isNew && !other.isNew) {
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
