package spring.kraft.service.fixture

import spring.kraft.form.UpdateForm
import spring.kraft.jpa.AggregateRootBaseEntity
import spring.kraft.jpa.BaseEntity
import spring.kraft.jpa.type.AggregateRootAware
import spring.kraft.jpa.type.Checkable

data class ServiceCreateForm(
    val name: String,
)

data class ServiceUpdateForm(
    override val id: Long,
    val name: String,
) : UpdateForm<Long>

class TestServiceEntity(
    id: Long? = null,
    val name: String = "",
) : BaseEntity<Long>() {
    override var id: Long? = id
}

class TestCheckableEntity(
    id: Long? = null,
    val name: String = "",
) : BaseEntity<Long>(),
    Checkable {
    override var id: Long? = id
    var checked: Boolean = false

    override fun check() {
        checked = true
    }
}

class TestAggregateRoot(
    id: Long? = null,
) : AggregateRootBaseEntity<Long, TestAggregateRoot>() {
    override var id: Long? = id
}

class TestAggregateEntity(
    id: Long? = null,
    private val root: TestAggregateRoot,
) : BaseEntity<Long>(),
    AggregateRootAware<Long, TestAggregateRoot> {
    override var id: Long? = id

    override fun aggregateRoot(): TestAggregateRoot = root
}

class OtherAggregateRoot(
    id: Long? = null,
) : AggregateRootBaseEntity<Long, OtherAggregateRoot>() {
    override var id: Long? = id
}

class OtherAggregateEntity(
    id: Long? = null,
    private val root: OtherAggregateRoot,
) : BaseEntity<Long>(),
    AggregateRootAware<Long, OtherAggregateRoot> {
    override var id: Long? = id

    override fun aggregateRoot(): OtherAggregateRoot = root
}
