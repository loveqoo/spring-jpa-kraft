package spring.kraft.jpa.fixture

import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import spring.kraft.jpa.BaseEntity

@Entity
@Table(name = "no_identity_column_entity")
class NoIdentityColumnEntity(
    val name: String,
) : BaseEntity<Long>() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    override var id: Long? = null
}
