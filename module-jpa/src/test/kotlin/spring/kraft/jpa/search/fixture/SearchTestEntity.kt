package spring.kraft.jpa.search.fixture

import jakarta.persistence.Column
import jakarta.persistence.Entity
import jakarta.persistence.GeneratedValue
import jakarta.persistence.GenerationType
import jakarta.persistence.Id
import jakarta.persistence.Table
import java.math.BigDecimal
import java.time.LocalDateTime

@Entity
@Table(name = "search_test_entity")
class SearchTestEntity(
    @Column(name = "name", nullable = false)
    val name: String,
    @Column(name = "status", nullable = false)
    val status: String = "ACTIVE",
    @Column(name = "amount", nullable = true)
    val amount: BigDecimal? = null,
    @Column(name = "count", nullable = true)
    val count: Int? = null,
    @Column(name = "created_at", nullable = true)
    val createdAt: LocalDateTime? = null,
) {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    var id: Long? = null
}
