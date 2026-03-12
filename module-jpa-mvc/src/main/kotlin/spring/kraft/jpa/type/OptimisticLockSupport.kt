package spring.kraft.jpa.type

interface OptimisticLockSupport {
    val versionNumber: Long

    fun versionUp()

    object Columns {
        object VersionNumber {
            const val NAME = "version"
        }
    }
}
