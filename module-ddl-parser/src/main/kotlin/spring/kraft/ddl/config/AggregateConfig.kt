package spring.kraft.ddl.config

data class AggregateConfig(
    val basePackage: String,
    val aggregates: List<AggregateDefinition> = emptyList(),
    val idStrategy: IdStrategy = IdStrategy.IDENTITY,
)

data class AggregateDefinition(
    val root: String,
    val relations: List<RelationDefinition> = emptyList(),
    val entities: List<EntityDefinition> = emptyList(),
    val idStrategy: IdStrategy? = null,
)

data class EntityDefinition(
    val table: String,
    val relations: List<RelationDefinition> = emptyList(),
    val idStrategy: IdStrategy? = null,
)

enum class IdStrategy {
    IDENTITY,
    SEQUENCE,
    UUID,
    AUTO,
    NONE,
}

data class RelationDefinition(
    val type: RelationType,
    val target: String,
    val joinColumn: String,
)

enum class RelationType {
    OneToOne,
    OneToMany,
    ManyToOne,
}
