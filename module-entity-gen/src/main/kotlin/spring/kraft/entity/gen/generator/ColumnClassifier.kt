package spring.kraft.entity.gen.generator

import spring.kraft.entity.gen.TableColumn
import spring.kraft.entity.gen.TableDef

enum class ColumnRole {
    PK,
    SKIP,
    JOIN_COLUMN,
    NORMAL,
}

data class ClassifiedColumn(
    val column: TableColumn,
    val role: ColumnRole,
    val isIdentityColumn: Boolean,
)

object ColumnClassifier {
    private val BASE_ENTITY_COLUMNS =
        setOf(
            "created_at",
            "created_by",
            "updated_at",
            "updated_by",
        )

    private val AGGREGATE_ROOT_COLUMNS =
        BASE_ENTITY_COLUMNS +
            setOf(
                "version",
                "deleted",
            )

    fun classify(
        table: TableDef,
        isAggregateRoot: Boolean,
        joinColumns: Set<String>,
    ): List<ClassifiedColumn> {
        val skipColumns = if (isAggregateRoot) AGGREGATE_ROOT_COLUMNS else BASE_ENTITY_COLUMNS
        val singleColumnUniqueIndexes =
            table.indexes
                .filter { it.unique && it.columns.size == 1 }
                .flatMap { it.columns }
                .toSet()

        return table.columns.map { column ->
            val role =
                when {
                    column.primaryKey -> ColumnRole.PK
                    column.name in skipColumns -> ColumnRole.SKIP
                    column.name in joinColumns -> ColumnRole.JOIN_COLUMN
                    else -> ColumnRole.NORMAL
                }
            val isIdentity =
                role == ColumnRole.NORMAL &&
                    (column.unique || column.name in singleColumnUniqueIndexes)
            ClassifiedColumn(
                column = column,
                role = role,
                isIdentityColumn = isIdentity,
            )
        }
    }
}
