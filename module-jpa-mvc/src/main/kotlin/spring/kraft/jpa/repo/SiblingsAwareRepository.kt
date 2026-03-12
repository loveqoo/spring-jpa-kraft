package spring.kraft.jpa.repo

import spring.kraft.jpa.type.ParentIdAware

interface SiblingsAwareRepository<E : ParentIdAware<P_ID>, P_ID : Comparable<P_ID>> {
    fun findSiblings(parentId: P_ID): List<E>
}
