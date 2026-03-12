package spring.kraft.form.fixture

import spring.kraft.jpa.type.Identifiable

data class TestEntity(
    override var id: Long? = null,
    val name: String = "",
) : Identifiable<Long> {
    override val isNew: Boolean get() = id == null
}

data class TestParent1(
    override var id: Long? = null,
) : Identifiable<Long> {
    override val isNew: Boolean get() = id == null
}

data class TestParent2(
    override var id: String? = null,
) : Identifiable<String> {
    override val isNew: Boolean get() = id == null
}

data class TestParent3(
    override var id: Long? = null,
) : Identifiable<Long> {
    override val isNew: Boolean get() = id == null
}

data class TestParent4(
    override var id: Long? = null,
) : Identifiable<Long> {
    override val isNew: Boolean get() = id == null
}
