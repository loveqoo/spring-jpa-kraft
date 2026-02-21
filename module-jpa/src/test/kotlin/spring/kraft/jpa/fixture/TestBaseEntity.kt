package spring.kraft.jpa.fixture

import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import spring.kraft.jpa.BaseEntity
import spring.kraft.jpa.IdentityColumn

@Entity
@Table(name = "test_base_entity")
class TestBaseEntity(
    @get:IdentityColumn
    val name: String,
) : BaseEntity<Long>() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    override var id: Long? = null
}
