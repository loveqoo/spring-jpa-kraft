package spring.kraft.entity.gen.generator

object ColumnTypeMapper {
    fun toKotlinType(
        typeName: String,
        typeValue: Int? = null,
    ): String {
        val lower = typeName.lowercase()
        return when {
            lower == "bigint" -> "Long"
            lower in setOf("int", "integer") -> "Int"
            lower == "smallint" -> "Short"
            lower == "tinyint" && typeValue == 1 -> "Boolean"
            lower == "tinyint" -> "Byte"
            lower in setOf("varchar", "char", "text", "mediumtext", "longtext", "json") -> "String"
            lower in setOf("boolean", "bool") -> "Boolean"
            lower in setOf("timestamp", "datetime") -> "LocalDateTime"
            lower == "date" -> "LocalDate"
            lower == "time" -> "LocalTime"
            lower in setOf("decimal", "numeric") -> "BigDecimal"
            lower == "float" -> "Float"
            lower == "double" -> "Double"
            lower in setOf("binary", "varbinary", "blob") -> "ByteArray"
            else -> "String"
        }
    }

    fun requiredImport(
        typeName: String,
        typeValue: Int? = null,
    ): String? {
        val lower = typeName.lowercase()
        return when {
            lower in setOf("timestamp", "datetime") -> "java.time.LocalDateTime"
            lower == "date" -> "java.time.LocalDate"
            lower == "time" -> "java.time.LocalTime"
            lower in setOf("decimal", "numeric") -> "java.math.BigDecimal"
            else -> null
        }
    }
}
