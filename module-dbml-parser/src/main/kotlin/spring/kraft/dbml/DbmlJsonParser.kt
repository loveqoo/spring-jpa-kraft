package spring.kraft.dbml

import tools.jackson.module.kotlin.jacksonObjectMapper
import tools.jackson.module.kotlin.readValue

class DbmlJsonParser {
    private val mapper = jacksonObjectMapper()

    fun parse(json: String): DbmlSchema {
        val root = mapper.readValue<DbmlRoot>(json)
        val tables =
            root.schemas.flatMap { schema ->
                schema.tables.map { table -> toDbmlTable(table, schema.name) }
            }
        return DbmlSchema(tables = tables)
    }

    private fun toDbmlTable(
        table: RawTable,
        schemaName: String?,
    ): DbmlTable =
        DbmlTable(
            name = table.name,
            schema = schemaName,
            columns = table.fields.map(::toDbmlColumn),
            indexes = table.indexes.map(::toDbmlIndex),
        )

    private fun toDbmlColumn(field: RawField): DbmlColumn {
        val isPk = field.pk
        return DbmlColumn(
            name = field.name,
            typeName = field.type.type_name,
            typeValue = field.type.value,
            primaryKey = isPk,
            notNull = isPk || field.not_null,
            unique = field.unique,
            autoIncrement = field.increment,
            defaultValue = field.dbdefault?.value?.toString(),
            note = field.note?.value,
        )
    }

    private fun toDbmlIndex(index: RawIndex): DbmlIndex =
        DbmlIndex(
            name = index.name,
            columns = index.columns.map { it.value },
            unique = index.unique,
            primaryKey = index.pk,
        )
}

// --- Raw JSON mapping models (internal) ---

private data class DbmlRoot(
    val schemas: List<RawSchema> = emptyList(),
)

private data class RawSchema(
    val name: String? = null,
    val tables: List<RawTable> = emptyList(),
)

private data class RawTable(
    val name: String,
    val fields: List<RawField> = emptyList(),
    val indexes: List<RawIndex> = emptyList(),
)

private data class RawField(
    val name: String,
    val type: RawType,
    val pk: Boolean = false,
    val not_null: Boolean = false,
    val unique: Boolean = false,
    val increment: Boolean = false,
    val dbdefault: RawDefault? = null,
    val note: RawNote? = null,
)

private data class RawType(
    val type_name: String,
    val value: Int? = null,
)

private data class RawDefault(
    val value: Any? = null,
    val type: String? = null,
)

private data class RawNote(
    val value: String? = null,
)

private data class RawIndex(
    val name: String? = null,
    val unique: Boolean = false,
    val pk: Boolean = false,
    val columns: List<RawIndexColumn> = emptyList(),
)

private data class RawIndexColumn(
    val type: String = "column",
    val value: String,
)
