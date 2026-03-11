package spring.kraft.entity.gen.config

import spring.kraft.entity.gen.TableSchema

data class AggregateConfig(
    val basePackage: String,
    val aggregates: List<AggregateDefinition> = emptyList(),
    val idStrategy: IdStrategy = IdStrategy.IDENTITY,
    val enums: Map<String, List<String>> = emptyMap(),
    val tableSchema: TableSchema? = null,
)

data class AggregateDefinition(
    val root: String,
    val relations: List<RelationDefinition> = emptyList(),
    val entities: List<EntityDefinition> = emptyList(),
    val idStrategy: IdStrategy? = null,
    val columnOverrides: Map<String, ColumnOverride> = emptyMap(),
)

data class EntityDefinition(
    val table: String,
    val relations: List<RelationDefinition> = emptyList(),
    val idStrategy: IdStrategy? = null,
    val columnOverrides: Map<String, ColumnOverride> = emptyMap(),
)

data class ColumnOverride(
    val enumType: String? = null,
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
