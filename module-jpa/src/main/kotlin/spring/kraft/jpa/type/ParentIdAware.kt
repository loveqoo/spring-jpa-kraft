package spring.kraft.jpa.type

interface ParentIdAware<ID : Comparable<ID>> {
    fun parentId(): ID
}
