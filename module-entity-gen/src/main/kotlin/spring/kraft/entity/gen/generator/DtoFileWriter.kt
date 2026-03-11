package spring.kraft.entity.gen.generator

class DtoFileWriter {
    fun write(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        sb.appendLine("package ${metadata.basePackage}")
        sb.appendLine()

        val imports = mutableSetOf("java.io.Serializable")
        metadata.normalColumns.forEach { classified ->
            if (classified.column.name !in metadata.enumOverrides) {
                val imp = ColumnTypeMapper.requiredImport(classified.column.typeName, classified.column.typeValue)
                if (imp != null) imports.add(imp)
            }
        }
        imports.sorted().forEach { sb.appendLine("import $it") }
        sb.appendLine()

        sb.appendLine("data class ${metadata.className}Dto(")
        sb.appendLine("    val id: ${metadata.idType},")
        metadata.normalColumns.forEach { classified ->
            val col = classified.column
            val enumType = metadata.enumOverrides[col.name]
            val kotlinType = if (enumType != null) "String" else ColumnTypeMapper.toKotlinType(col.typeName, col.typeValue)
            val propertyName = NameConverter.toPropertyName(col.name)
            sb.appendLine("    val $propertyName: $kotlinType,")
        }
        sb.appendLine("    val createdAt: String = \"\",")
        sb.appendLine("    val createdBy: String = \"\",")
        sb.appendLine("    val updatedAt: String = \"\",")
        sb.appendLine("    val updatedBy: String = \"\",")
        sb.appendLine(") : Serializable")
        sb.appendLine()

        return sb.toString()
    }
}
