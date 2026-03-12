package spring.kraft.jpa.search

class SearchBinder<E> {
    internal val bindings = mutableMapOf<String, SearchOp>()
    internal val excluded = mutableSetOf<String>()
    internal var allowUnbound: Boolean = false

    fun bind(fieldName: String): BindStep = BindStep(fieldName)

    fun excluding(vararg fieldNames: String) {
        excluded.addAll(fieldNames)
    }

    fun allowUnboundFields() {
        allowUnbound = true
    }

    inner class BindStep(
        private val name: String,
    ) {
        fun to(op: SearchOp) {
            bindings[name] = op
        }
    }
}
