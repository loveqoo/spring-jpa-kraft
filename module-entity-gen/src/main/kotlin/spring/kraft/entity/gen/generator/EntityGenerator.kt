package spring.kraft.entity.gen.generator

import spring.kraft.entity.gen.TableDef
import spring.kraft.entity.gen.TableSchema
import spring.kraft.entity.gen.config.AggregateConfig
import spring.kraft.entity.gen.config.IdStrategy
import spring.kraft.entity.gen.config.RelationDefinition
import spring.kraft.entity.gen.config.RelationType
import java.io.File

class EntityGenerator {
    private val writer = EntityFileWriter()

    fun generate(
        schema: TableSchema,
        config: AggregateConfig,
        outputDir: File,
    ) {
        val tableMap = schema.tables.associateBy { it.name }
        validateConfig(config, tableMap)

        val entityPackage = "${config.basePackage}.entity"
        val rootTables = config.aggregates.map { it.root }.toSet()
        val relationsByTable = buildRelationsByTable(config)
        val idStrategyByTable = buildIdStrategyByTable(config)

        schema.tables.forEach { table ->
            val isAggregateRoot = table.name in rootTables
            val rels = relationsByTable[table.name] ?: emptyList()

            val forwardRels = classifyForward(rels, table)
            val reverseRels = classifyReverse(rels, table)

            val joinColumns = forwardRels.map { it.joinColumn }.toSet()
            val classified = ColumnClassifier.classify(table, isAggregateRoot, joinColumns)
            val className = NameConverter.toClassName(table.name)

            val forwardRelations = buildForwardRelations(forwardRels, table)
            val reverseRelations = buildReverseRelations(reverseRels, table.name, relationsByTable)

            val metadata =
                EntityMetadata(
                    tableName = table.name,
                    className = className,
                    packageName = entityPackage,
                    isAggregateRoot = isAggregateRoot,
                    classifiedColumns = classified,
                    relations = forwardRelations,
                    reverseRelations = reverseRelations,
                    idStrategy = idStrategyByTable[table.name] ?: config.idStrategy,
                )

            val source = writer.write(metadata)
            val packageDir = File(outputDir, entityPackage.replace('.', '/'))
            packageDir.mkdirs()
            File(packageDir, "$className.kt").writeText(source)
        }
    }

    private fun classifyForward(
        rels: List<RelationDefinition>,
        sourceTable: TableDef,
    ): List<RelationDefinition> =
        rels.filter { rel ->
            when (rel.type) {
                RelationType.ManyToOne -> true
                RelationType.OneToOne -> sourceTable.columns.any { it.name == rel.joinColumn }
                RelationType.OneToMany -> false
            }
        }

    private fun classifyReverse(
        rels: List<RelationDefinition>,
        sourceTable: TableDef,
    ): List<RelationDefinition> =
        rels.filter { rel ->
            when (rel.type) {
                RelationType.OneToMany -> true
                RelationType.OneToOne -> sourceTable.columns.none { it.name == rel.joinColumn }
                RelationType.ManyToOne -> false
            }
        }

    private fun validateConfig(
        config: AggregateConfig,
        tableMap: Map<String, TableDef>,
    ) {
        config.aggregates.forEach { agg ->
            require(agg.root in tableMap) {
                "Aggregate root table '${agg.root}' not found in schema"
            }
            validateRelations(agg.root, agg.relations, tableMap)
            agg.entities.forEach { entity ->
                require(entity.table in tableMap) {
                    "Entity table '${entity.table}' not found in schema"
                }
                validateRelations(entity.table, entity.relations, tableMap)
            }
        }
    }

    private fun validateRelations(
        tableName: String,
        relations: List<RelationDefinition>,
        tableMap: Map<String, TableDef>,
    ) {
        val sourceTable = tableMap.getValue(tableName)
        relations.forEach { rel ->
            require(rel.target in tableMap) {
                "Relation target '${rel.target}' in '$tableName' not found in schema"
            }
            when (rel.type) {
                RelationType.ManyToOne -> {
                    val hasJoinColumn = sourceTable.columns.any { it.name == rel.joinColumn }
                    require(hasJoinColumn) {
                        "Join column '${rel.joinColumn}' not found in table '$tableName'"
                    }
                }
                RelationType.OneToOne -> {
                    val inSource = sourceTable.columns.any { it.name == rel.joinColumn }
                    val targetTable = tableMap.getValue(rel.target)
                    val inTarget = targetTable.columns.any { it.name == rel.joinColumn }
                    require(inSource || inTarget) {
                        "Join column '${rel.joinColumn}' not found in '$tableName' or '${rel.target}'"
                    }
                }
                RelationType.OneToMany -> {
                    val targetTable = tableMap.getValue(rel.target)
                    val hasJoinColumn = targetTable.columns.any { it.name == rel.joinColumn }
                    require(hasJoinColumn) {
                        "Join column '${rel.joinColumn}' not found in target table '${rel.target}'"
                    }
                }
            }
        }
    }

    private fun buildRelationsByTable(config: AggregateConfig): Map<String, List<RelationDefinition>> {
        val map = mutableMapOf<String, MutableList<RelationDefinition>>()
        config.aggregates.forEach { agg ->
            agg.relations.forEach { rel ->
                map.getOrPut(agg.root) { mutableListOf() }.add(rel)
            }
            agg.entities.forEach { entity ->
                entity.relations.forEach { rel ->
                    map.getOrPut(entity.table) { mutableListOf() }.add(rel)
                }
            }
        }
        return map
    }

    private fun buildIdStrategyByTable(config: AggregateConfig): Map<String, IdStrategy> {
        val map = mutableMapOf<String, IdStrategy>()
        config.aggregates.forEach { agg ->
            val aggStrategy = agg.idStrategy ?: config.idStrategy
            map[agg.root] = agg.idStrategy ?: config.idStrategy
            agg.entities.forEach { entity ->
                map[entity.table] = entity.idStrategy ?: aggStrategy
            }
        }
        return map
    }

    private fun buildForwardRelations(
        rels: List<RelationDefinition>,
        sourceTable: TableDef,
    ): List<ResolvedRelation> =
        rels.map { rel ->
            val targetClassName = NameConverter.toClassName(rel.target)
            val propertyName = derivePropertyNameFromJoinColumn(rel.joinColumn)
            val joinCol = sourceTable.columns.firstOrNull { it.name == rel.joinColumn }
            ResolvedRelation(
                type = rel.type.name,
                targetClassName = targetClassName,
                joinColumnName = rel.joinColumn,
                propertyName = propertyName,
                mappedBy = null,
                nullable = joinCol?.notNull?.not() ?: false,
            )
        }

    private fun buildReverseRelations(
        rels: List<RelationDefinition>,
        ownerTableName: String,
        relationsByTable: Map<String, List<RelationDefinition>>,
    ): List<ResolvedRelation> =
        rels.map { rel ->
            val targetClassName = NameConverter.toClassName(rel.target)
            val reverseType =
                when (rel.type) {
                    RelationType.OneToMany -> "OneToMany"
                    else -> "OneToOne"
                }
            val propertyName =
                if (reverseType == "OneToMany") {
                    NameConverter.toCamelCase(rel.target)
                } else {
                    targetClassName.replaceFirstChar { it.lowercaseChar() }
                }
            val hasMappedBy = hasCounterpartForward(rel.target, ownerTableName, rel.joinColumn, relationsByTable)
            val mappedBy =
                if (hasMappedBy) {
                    derivePropertyNameFromJoinColumn(rel.joinColumn)
                } else {
                    null
                }
            ResolvedRelation(
                type = reverseType,
                targetClassName = targetClassName,
                joinColumnName = rel.joinColumn,
                propertyName = propertyName,
                mappedBy = mappedBy,
                nullable = false,
            )
        }

    private fun hasCounterpartForward(
        targetTable: String,
        ownerTable: String,
        joinColumn: String,
        relationsByTable: Map<String, List<RelationDefinition>>,
    ): Boolean {
        val targetRels = relationsByTable[targetTable] ?: return false
        return targetRels.any { rel ->
            rel.target == ownerTable &&
                rel.joinColumn == joinColumn &&
                (rel.type == RelationType.ManyToOne || rel.type == RelationType.OneToOne)
        }
    }

    private fun derivePropertyNameFromJoinColumn(joinColumn: String): String {
        val withoutId =
            if (joinColumn.endsWith("_id")) {
                joinColumn.dropLast(3)
            } else {
                joinColumn
            }
        return NameConverter.toCamelCase(withoutId)
    }
}
