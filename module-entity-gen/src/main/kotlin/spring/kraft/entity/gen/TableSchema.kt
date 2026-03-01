package spring.kraft.entity.gen

data class TableSchema(
    val tables: List<TableDef>,
)

data class TableDef(
    val name: String,
    val schema: String?,
    val columns: List<TableColumn>,
    val indexes: List<TableIndex>,
)

data class TableColumn(
    val name: String,
    val typeName: String,
    val typeValue: Int?,
    val primaryKey: Boolean,
    val notNull: Boolean,
    val unique: Boolean,
    val autoIncrement: Boolean,
    val defaultValue: String?,
    val note: String?,
)

data class TableIndex(
    val name: String?,
    val columns: List<String>,
    val unique: Boolean,
    val primaryKey: Boolean,
)
