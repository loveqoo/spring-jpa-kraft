package spring.kraft.entity.gen.generator

import spring.kraft.entity.gen.TableDef
import spring.kraft.entity.gen.TableSchema
import spring.kraft.entity.gen.config.AggregateConfig
import spring.kraft.entity.gen.config.ColumnOverride
import spring.kraft.entity.gen.config.EntityMode
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
        val metadataList = buildMetadataList(schema, config)

        metadataList.forEach { metadata ->
            val source = writer.write(metadata)
            val packageDir = File(outputDir, metadata.packageName.replace('.', '/'))
            packageDir.mkdirs()
            File(packageDir, "${metadata.className}.kt").writeText(source)
        }
    }

    fun buildMetadataList(
        schema: TableSchema,
        config: AggregateConfig,
    ): List<EntityMetadata> {
        val tableMap = schema.tables.associateBy { it.name }
        validateConfig(config, tableMap)

        val rootTables = config.aggregates.map { it.root }.toSet()
        val relationsByTable = buildRelationsByTable(config)
        val idStrategyByTable = buildIdStrategyByTable(config)
        val enumOverridesByTable = buildEnumOverridesByTable(config)
        val basePackageByTable = buildBasePackageByTable(config, schema)
        val entityModeByTable = buildEntityModeByTable(config)

        return schema.tables.map { table ->
            val isAggregateRoot = table.name in rootTables
            val rels = relationsByTable[table.name] ?: emptyList()

            val forwardRels = classifyForward(rels, table)
            val reverseRels = classifyReverse(rels, table)

            val joinColumns = forwardRels.map { it.joinColumn }.toSet()
            val classified = ColumnClassifier.classify(table, isAggregateRoot, joinColumns)
            val className = NameConverter.toClassName(table.name)
            val entityBasePackage = basePackageByTable.getValue(table.name)

            val forwardRelations = buildForwardRelations(forwardRels, table, tableMap, basePackageByTable)
            val reverseRelations =
                buildReverseRelations(reverseRels, table.name, relationsByTable, basePackageByTable)

            val tableEnumOverrides = enumOverridesByTable[table.name] ?: emptyMap()

            EntityMetadata(
                tableName = table.name,
                className = className,
                packageName = entityBasePackage,
                basePackage = entityBasePackage,
                isAggregateRoot = isAggregateRoot,
                classifiedColumns = classified,
                relations = forwardRelations,
                reverseRelations = reverseRelations,
                idStrategy = idStrategyByTable[table.name] ?: config.idStrategy,
                enumOverrides = tableEnumOverrides,
                enumPackage = if (tableEnumOverrides.isNotEmpty()) config.basePackage else "",
                entityMode = entityModeByTable[table.name] ?: EntityMode(),
            )
        }
    }

    private fun buildBasePackageByTable(
        config: AggregateConfig,
        schema: TableSchema,
    ): Map<String, String> {
        val map = mutableMapOf<String, String>()
        val tablesInAggregates = mutableSetOf<String>()

        config.aggregates.forEach { agg ->
            map[agg.root] = "${config.basePackage}.${toPackageName(agg.root)}"
            tablesInAggregates.add(agg.root)

            agg.entities.forEach { entity ->
                map[entity.table] = "${config.basePackage}.${toPackageName(entity.table)}"
                tablesInAggregates.add(entity.table)
            }
        }

        schema.tables
            .filter { it.name !in tablesInAggregates }
            .forEach { table ->
                map[table.name] = "${config.basePackage}.${toPackageName(table.name)}"
            }

        return map
    }

    private fun toPackageName(tableName: String): String = NameConverter.toClassName(tableName).lowercase()

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

    private fun buildEntityModeByTable(config: AggregateConfig): Map<String, EntityMode> {
        val map = mutableMapOf<String, EntityMode>()
        config.aggregates.forEach { agg ->
            map[agg.root] = agg.entityMode
            agg.entities.forEach { entity ->
                map[entity.table] = entity.entityMode
            }
        }
        return map
    }

    private fun buildEnumOverridesByTable(config: AggregateConfig): Map<String, Map<String, String>> {
        val map = mutableMapOf<String, Map<String, String>>()
        config.aggregates.forEach { agg ->
            val rootOverrides = toEnumOverrideMap(agg.columnOverrides)
            if (rootOverrides.isNotEmpty()) {
                map[agg.root] = rootOverrides
            }
            agg.entities.forEach { entity ->
                val entityOverrides = toEnumOverrideMap(entity.columnOverrides)
                if (entityOverrides.isNotEmpty()) {
                    map[entity.table] = entityOverrides
                }
            }
        }
        return map
    }

    private fun toEnumOverrideMap(columnOverrides: Map<String, ColumnOverride>): Map<String, String> =
        columnOverrides
            .mapNotNull { (colName, override) ->
                override.enumType?.let { colName to it }
            }.toMap()

    private fun buildForwardRelations(
        rels: List<RelationDefinition>,
        sourceTable: TableDef,
        tableMap: Map<String, TableDef>,
        basePackageByTable: Map<String, String>,
    ): List<ResolvedRelation> =
        rels.map { rel ->
            val targetClassName = NameConverter.toClassName(rel.target)
            val propertyName = derivePropertyNameFromJoinColumn(rel.joinColumn)
            val joinCol = sourceTable.columns.firstOrNull { it.name == rel.joinColumn }
            val targetPkCol = tableMap[rel.target]?.columns?.firstOrNull { it.primaryKey }
            val targetIdType =
                if (targetPkCol != null) {
                    ColumnTypeMapper.toKotlinType(targetPkCol.typeName, targetPkCol.typeValue)
                } else {
                    "Long"
                }
            ResolvedRelation(
                type = rel.type.name,
                targetClassName = targetClassName,
                joinColumnName = rel.joinColumn,
                propertyName = propertyName,
                mappedBy = null,
                nullable = joinCol?.notNull?.not() ?: false,
                targetIdType = targetIdType,
                targetBasePackage = basePackageByTable[rel.target] ?: "",
            )
        }

    private fun buildReverseRelations(
        rels: List<RelationDefinition>,
        ownerTableName: String,
        relationsByTable: Map<String, List<RelationDefinition>>,
        basePackageByTable: Map<String, String>,
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
                targetBasePackage = basePackageByTable[rel.target] ?: "",
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
