package spring.kraft.service.event

data class AggregateRootVersionUpEvent<ID : Comparable<ID>>(
    val aggregateRootId: ID,
    val aggregateRootType: Class<*>,
    val sourceEntityId: Any,
    val sourceEntityType: Class<*>,
)
