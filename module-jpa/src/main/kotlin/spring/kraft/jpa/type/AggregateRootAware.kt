package spring.kraft.jpa.type

import spring.kraft.jpa.AggregateRootBaseEntity

interface AggregateRootAware<ID : Comparable<ID>, E : AggregateRootBaseEntity<ID, E>> {
    fun aggregateRoot(): E
}
