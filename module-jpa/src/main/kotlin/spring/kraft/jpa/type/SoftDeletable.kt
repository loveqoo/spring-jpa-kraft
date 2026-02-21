package spring.kraft.jpa.type

interface SoftDeletable {
    val deleted: Boolean

    fun delete()

    object Columns {
        object Deleted {
            const val NAME = "deleted"
        }
    }
}
