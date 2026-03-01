package spring.kraft.ddl.generator

import spring.kraft.ddl.TableColumn
import spring.kraft.ddl.config.IdStrategy

data class EntityMetadata(
    val tableName: String,
    val className: String,
    val packageName: String,
    val isAggregateRoot: Boolean,
    val classifiedColumns: List<ClassifiedColumn>,
    val relations: List<ResolvedRelation>,
    val reverseRelations: List<ResolvedRelation>,
    val idStrategy: IdStrategy = IdStrategy.IDENTITY,
)

data class ResolvedRelation(
    val type: String,
    val targetClassName: String,
    val joinColumnName: String,
    val propertyName: String,
    val mappedBy: String?,
    val nullable: Boolean,
)

class EntityFileWriter {
    fun write(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val imports = collectImports(metadata)

        sb.appendLine("package ${metadata.packageName}")
        sb.appendLine()

        imports.sorted().forEach { sb.appendLine("import $it") }
        sb.appendLine()

        sb.appendLine("@Entity")
        sb.appendLine("@Table(name = \"${metadata.tableName}\")")

        val constructorParams = buildConstructorParams(metadata)
        val superClass = buildSuperClass(metadata)

        if (constructorParams.isEmpty()) {
            sb.appendLine("class ${metadata.className} : $superClass {")
        } else {
            sb.appendLine("class ${metadata.className}(")
            constructorParams.forEachIndexed { index, param ->
                sb.appendLine("$param,")
            }
            sb.appendLine(") : $superClass {")
        }

        appendBody(sb, metadata)

        sb.appendLine("}")

        return sb.toString()
    }

    private fun collectImports(metadata: EntityMetadata): Set<String> {
        val imports = mutableSetOf<String>()
        imports.add("jakarta.persistence.*")

        if (metadata.isAggregateRoot) {
            imports.add("spring.kraft.jpa.AggregateRootBaseEntity")
        } else {
            imports.add("spring.kraft.jpa.BaseEntity")
        }

        val hasIdentityColumn = metadata.classifiedColumns.any { it.isIdentityColumn }
        if (hasIdentityColumn) {
            imports.add("spring.kraft.jpa.IdentityColumn")
        }

        metadata.classifiedColumns
            .filter { it.role == ColumnRole.NORMAL || it.role == ColumnRole.PK }
            .forEach { classified ->
                val imp =
                    ColumnTypeMapper.requiredImport(
                        classified.column.typeName,
                        classified.column.typeValue,
                    )
                if (imp != null) imports.add(imp)
            }

        return imports
    }

    private fun buildConstructorParams(metadata: EntityMetadata): List<String> {
        val params = mutableListOf<String>()

        metadata.classifiedColumns
            .filter { it.role == ColumnRole.NORMAL }
            .forEach { classified ->
                val col = classified.column
                val kotlinType = ColumnTypeMapper.toKotlinType(col.typeName, col.typeValue)
                val annotations = buildColumnAnnotations(classified)
                params.add(buildConstructorParam(annotations, col.name, kotlinType))
            }

        metadata.relations
            .filter { it.type == "ManyToOne" || it.type == "OneToOne" }
            .forEach { rel ->
                params.add(buildRelationParam(rel))
            }

        return params
    }

    private fun buildColumnAnnotations(classified: ClassifiedColumn): List<String> {
        val annotations = mutableListOf<String>()
        if (classified.isIdentityColumn) {
            annotations.add("    @get:IdentityColumn")
        }
        annotations.add("    ${buildColumnAnnotation(classified.column)}")
        return annotations
    }

    private fun buildConstructorParam(
        annotations: List<String>,
        columnName: String,
        kotlinType: String,
    ): String {
        val sb = StringBuilder()
        annotations.forEach { sb.appendLine(it) }
        val propertyName = NameConverter.toPropertyName(columnName)
        sb.append("    val $propertyName: $kotlinType")
        return sb.toString()
    }

    private fun buildRelationParam(rel: ResolvedRelation): String {
        val sb = StringBuilder()
        val fetchType = "FetchType.LAZY"
        val nullable = if (rel.nullable) ", nullable = true" else ", nullable = false"
        sb.appendLine("    @${rel.type}(fetch = $fetchType)")
        sb.appendLine("    @JoinColumn(name = \"${rel.joinColumnName}\"$nullable)")
        val typeStr = if (rel.nullable) "${rel.targetClassName}?" else rel.targetClassName
        sb.append("    val ${rel.propertyName}: $typeStr")
        return sb.toString()
    }

    private fun buildSuperClass(metadata: EntityMetadata): String {
        val pkColumn = metadata.classifiedColumns.firstOrNull { it.role == ColumnRole.PK }
        val idType =
            if (pkColumn != null) {
                ColumnTypeMapper.toKotlinType(pkColumn.column.typeName, pkColumn.column.typeValue)
            } else {
                "Long"
            }
        return if (metadata.isAggregateRoot) {
            "AggregateRootBaseEntity<$idType, ${metadata.className}>()"
        } else {
            "BaseEntity<$idType>()"
        }
    }

    private fun appendBody(
        sb: StringBuilder,
        metadata: EntityMetadata,
    ) {
        val pkColumn = metadata.classifiedColumns.firstOrNull { it.role == ColumnRole.PK }
        if (pkColumn != null) {
            val col = pkColumn.column
            val idType = ColumnTypeMapper.toKotlinType(col.typeName, col.typeValue)
            sb.appendLine("    @Id")
            if (metadata.idStrategy != IdStrategy.NONE) {
                sb.appendLine("    @GeneratedValue(strategy = ${metadata.idStrategy.toGenerationType()})")
            }
            sb.appendLine("    ${buildColumnAnnotation(col)}")
            sb.appendLine("    override var id: $idType? = null")
        }

        metadata.reverseRelations.forEach { rel ->
            sb.appendLine()
            when (rel.type) {
                "OneToMany" -> {
                    if (rel.mappedBy != null) {
                        sb.appendLine(
                            "    @OneToMany(mappedBy = \"${rel.mappedBy}\", " +
                                "cascade = [CascadeType.ALL], orphanRemoval = true)",
                        )
                    } else {
                        sb.appendLine(
                            "    @OneToMany(cascade = [CascadeType.ALL], orphanRemoval = true)",
                        )
                        sb.appendLine("    @JoinColumn(name = \"${rel.joinColumnName}\")")
                    }
                    sb.appendLine(
                        "    val ${rel.propertyName}: MutableList<${rel.targetClassName}> = mutableListOf()",
                    )
                }
                "OneToOne" -> {
                    if (rel.mappedBy != null) {
                        sb.appendLine(
                            "    @OneToOne(mappedBy = \"${rel.mappedBy}\", " +
                                "cascade = [CascadeType.ALL], orphanRemoval = true)",
                        )
                    } else {
                        sb.appendLine(
                            "    @OneToOne(cascade = [CascadeType.ALL], orphanRemoval = true)",
                        )
                        sb.appendLine("    @JoinColumn(name = \"${rel.joinColumnName}\")")
                    }
                    sb.appendLine("    val ${rel.propertyName}: ${rel.targetClassName}? = null")
                }
            }
        }
    }

    private fun buildColumnAnnotation(column: TableColumn): String {
        val parts = mutableListOf<String>()
        parts.add("name = \"${column.name}\"")
        parts.add("nullable = ${!column.notNull}")

        if (column.unique) {
            parts.add("unique = true")
        }

        val lower = column.typeName.lowercase()
        if (lower in setOf("varchar", "char") && column.typeValue != null) {
            parts.add("length = ${column.typeValue}")
        }

        return "@Column(${parts.joinToString(", ")})"
    }

    private fun IdStrategy.toGenerationType(): String =
        when (this) {
            IdStrategy.IDENTITY -> "GenerationType.IDENTITY"
            IdStrategy.SEQUENCE -> "GenerationType.SEQUENCE"
            IdStrategy.UUID -> "GenerationType.UUID"
            IdStrategy.AUTO -> "GenerationType.AUTO"
            IdStrategy.NONE -> error("NONE strategy should not generate @GeneratedValue")
        }
}
