package spring.kraft.dbml

data class DbmlSchema(
    val tables: List<DbmlTable>,
)

data class DbmlTable(
    val name: String,
    val schema: String?,
    val columns: List<DbmlColumn>,
    val indexes: List<DbmlIndex>,
)

data class DbmlColumn(
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

data class DbmlIndex(
    val name: String?,
    val columns: List<String>,
    val unique: Boolean,
    val primaryKey: Boolean,
)
