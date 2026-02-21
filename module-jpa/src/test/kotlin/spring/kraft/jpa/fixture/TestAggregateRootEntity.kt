package spring.kraft.jpa.fixture

import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import spring.kraft.jpa.AggregateRootBaseEntity
import spring.kraft.jpa.IdentityColumn

@Entity
@Table(name = "test_aggregate_root_entity")
class TestAggregateRootEntity(
    @get:IdentityColumn
    val name: String,
) : AggregateRootBaseEntity<TestAggregateRootEntity, Long>() {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    override var id: Long? = null
}
