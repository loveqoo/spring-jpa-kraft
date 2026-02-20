package spring.kraft.jpa.type

interface OptimisticLockSupport {
    var versionNumber: Int

    fun versionUp(): Unit
}
