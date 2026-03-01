package spring.kraft.ddl

import spring.kraft.ddl.parser.MySQLParser
import spring.kraft.ddl.parser.MySQLParserBaseVisitor

class CreateTableVisitor : MySQLParserBaseVisitor<Unit>() {
    private val tables = mutableListOf<TableDef>()
    private val parseErrors = mutableListOf<String>()

    fun getTables(): List<TableDef> = tables.toList()

    fun getParseErrors(): List<String> = parseErrors.toList()

    override fun visitCreateTableStatement(ctx: MySQLParser.CreateTableStatementContext) {
        try {
            val (schemaName, tableName) = extractTableName(ctx.tableName())

            val columns = linkedMapOf<String, MutableColumn>()
            val primaryKeyColumns = linkedSetOf<String>()
            val uniqueColumns = linkedSetOf<String>()
            val indexes = mutableListOf<TableIndex>()

            ctx.tableElement().forEach { element ->
                processTableElement(element, columns, primaryKeyColumns, uniqueColumns, indexes)
            }

            primaryKeyColumns.forEach { colName ->
                columns[colName]?.apply {
                    primaryKey = true
                    notNull = true
                }
            }
            uniqueColumns.forEach { colName ->
                columns[colName]?.apply {
                    unique = true
                }
            }

            val tableColumns =
                columns.values.map { col ->
                    TableColumn(
                        name = col.name,
                        typeName = col.typeName,
                        typeValue = col.typeValue,
                        primaryKey = col.primaryKey,
                        notNull = col.notNull || col.primaryKey,
                        unique = col.unique,
                        autoIncrement = col.autoIncrement,
                        defaultValue = col.defaultValue,
                        note = null,
                    )
                }

            tables.add(TableDef(tableName, schemaName, tableColumns, indexes))
        } catch (e: Exception) {
            val firstLine =
                ctx.text
                    .lineSequence()
                    .firstOrNull()
                    ?.trim()
                    .orEmpty()
            parseErrors += "Failed to parse CREATE TABLE: $firstLine — ${e.message}"
        }
    }

    private fun processTableElement(
        element: MySQLParser.TableElementContext,
        columns: LinkedHashMap<String, MutableColumn>,
        primaryKeyColumns: LinkedHashSet<String>,
        uniqueColumns: LinkedHashSet<String>,
        indexes: MutableList<TableIndex>,
    ) {
        when {
            element.primaryKeyConstraint() != null -> {
                val cols = extractIndexColumns(element.primaryKeyConstraint().indexColumns())
                primaryKeyColumns.addAll(cols)
                indexes += TableIndex(name = null, columns = cols, unique = true, primaryKey = true)
            }

            element.uniqueConstraint() != null -> {
                val ctx = element.uniqueConstraint()
                val cols = extractIndexColumns(ctx.indexColumns())
                val name = ctx.identifier()?.let(::extractIdentifier)
                if (cols.size == 1) uniqueColumns.add(cols.first())
                indexes += TableIndex(name = name, columns = cols, unique = true, primaryKey = false)
            }

            element.indexDefinition() != null -> {
                val ctx = element.indexDefinition()
                val cols = extractIndexColumns(ctx.indexColumns())
                val name = ctx.identifier()?.let(::extractIdentifier)
                indexes += TableIndex(name = name, columns = cols, unique = false, primaryKey = false)
            }

            element.constraintWithName() != null -> {
                processConstraintWithName(
                    element.constraintWithName(),
                    primaryKeyColumns,
                    uniqueColumns,
                    indexes,
                )
            }

            element.foreignKeyConstraint() != null -> {}

            element.checkConstraint() != null -> {}

            element.columnDefinition() != null -> {
                parseColumnDefinition(element.columnDefinition())?.let {
                    columns[it.name] = it
                }
            }
        }
    }

    private fun processConstraintWithName(
        ctx: MySQLParser.ConstraintWithNameContext,
        primaryKeyColumns: LinkedHashSet<String>,
        uniqueColumns: LinkedHashSet<String>,
        indexes: MutableList<TableIndex>,
    ) {
        val constraintName = ctx.identifier()?.let(::extractIdentifier)
        val body = ctx.constraintBody()

        when (body) {
            is MySQLParser.ConstraintPKContext -> {
                val cols = extractIndexColumns(body.indexColumns())
                primaryKeyColumns.addAll(cols)
                indexes += TableIndex(name = constraintName, columns = cols, unique = true, primaryKey = true)
            }

            is MySQLParser.ConstraintUniqueContext -> {
                val cols = extractIndexColumns(body.indexColumns())
                val idName = body.identifier()?.let(::extractIdentifier) ?: constraintName
                if (cols.size == 1) uniqueColumns.add(cols.first())
                indexes += TableIndex(name = idName, columns = cols, unique = true, primaryKey = false)
            }

            is MySQLParser.ConstraintFKContext -> {}

            is MySQLParser.ConstraintCheckContext -> {}
        }
    }

    private fun parseColumnDefinition(ctx: MySQLParser.ColumnDefinitionContext): MutableColumn? {
        val name = extractIdentifier(ctx.identifier())
        val dataType = ctx.dataType()
        val typeName = dataType.typeName().text.lowercase()
        val typeValue = extractTypeValue(dataType)

        var primaryKey = false
        var notNull = false
        var unique = false
        var autoIncrement = false
        var defaultValue: String? = null

        ctx.columnAttribute().forEach { attr ->
            when (attr) {
                is MySQLParser.NotNullAttrContext -> notNull = true
                is MySQLParser.PrimaryKeyAttrContext -> {
                    primaryKey = true
                    notNull = true
                }
                is MySQLParser.UniqueAttrContext -> unique = true
                is MySQLParser.AutoIncrementAttrContext -> autoIncrement = true
                is MySQLParser.DefaultAttrContext -> {
                    defaultValue = extractDefaultValue(attr.defaultValue())
                }
            }
        }

        return MutableColumn(
            name = name,
            typeName = typeName,
            typeValue = typeValue,
            primaryKey = primaryKey,
            notNull = notNull,
            unique = unique,
            autoIncrement = autoIncrement,
            defaultValue = defaultValue,
        )
    }

    private fun extractTableName(ctx: MySQLParser.TableNameContext): Pair<String?, String> {
        val identifiers = ctx.identifier().map(::extractIdentifier)
        return when (identifiers.size) {
            0 -> null to ""
            1 -> null to identifiers[0]
            else -> identifiers[0] to identifiers[1]
        }
    }

    private fun extractIdentifier(ctx: MySQLParser.IdentifierContext): String {
        val text = ctx.text
        return text.removePrefix("`").removeSuffix("`")
    }

    private fun extractIndexColumns(ctx: MySQLParser.IndexColumnsContext): List<String> =
        ctx.indexColumn().map { extractIdentifier(it.identifier()) }

    private fun extractTypeValue(ctx: MySQLParser.DataTypeContext): Int? {
        val params = ctx.dataTypeParam()
        if (params.isEmpty()) return null
        return params[0].NUMBER()?.text?.toIntOrNull()
    }

    private fun extractDefaultValue(ctx: MySQLParser.DefaultValueContext): String {
        ctx.STRING_LITERAL()?.let { token ->
            val text = token.text
            return text.substring(1, text.length - 1).replace("''", "'")
        }
        ctx.DOUBLE_QUOTED_STRING()?.let { token ->
            val text = token.text
            return text.substring(1, text.length - 1)
        }
        return ctx.text
    }

    private data class MutableColumn(
        val name: String,
        val typeName: String,
        val typeValue: Int?,
        var primaryKey: Boolean,
        var notNull: Boolean,
        var unique: Boolean,
        val autoIncrement: Boolean,
        val defaultValue: String?,
    )
}
