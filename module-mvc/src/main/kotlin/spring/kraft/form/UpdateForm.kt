package spring.kraft.form

import spring.kraft.jpa.type.Identifiable

interface UpdateForm<ID : Comparable<ID>> {
    val id: ID

    companion object {
        fun <ID : Comparable<ID>, E : Identifiable<ID>> E?.updateEntity(
            target: E?,
            setter: (E) -> Unit,
        ): Result<Unit> =
            runCatching {
                if (target != null && (this == null || this.id != target.id)) {
                    setter(target)
                }
            }

        fun <P> P?.updateProperty(
            target: P?,
            setter: (P) -> Unit,
        ): Result<Unit> =
            runCatching {
                if (target != null && this != target) {
                    setter(target)
                }
            }

        fun <P1, P2> P1?.updateProperty(
            propertyRaw: P2?,
            propertySupplier: (P2) -> P1,
            setter: (P1) -> Unit,
        ): Result<Unit> =
            runCatching {
                if (propertyRaw != null) {
                    propertySupplier(propertyRaw).also { target ->
                        if (this != target) {
                            setter(target)
                        }
                    }
                }
            }
    }
}
