package spring.kraft.entity.gen.generator

class DtoFileWriter {
    fun write(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val dtoPackage = "${metadata.basePackage}.dto"

        sb.appendLine("package $dtoPackage")
        sb.appendLine()

        val imports = mutableSetOf("java.io.Serializable")
        metadata.normalColumns.forEach { classified ->
            val imp = ColumnTypeMapper.requiredImport(classified.column.typeName, classified.column.typeValue)
            if (imp != null) imports.add(imp)
        }
        imports.sorted().forEach { sb.appendLine("import $it") }
        sb.appendLine()

        sb.appendLine("data class ${metadata.className}Dto(")
        sb.appendLine("    val id: ${metadata.idType},")
        metadata.normalColumns.forEach { classified ->
            val col = classified.column
            val kotlinType = ColumnTypeMapper.toKotlinType(col.typeName, col.typeValue)
            val propertyName = NameConverter.toPropertyName(col.name)
            sb.appendLine("    val $propertyName: $kotlinType,")
        }
        sb.appendLine(") : Serializable")
        sb.appendLine()

        return sb.toString()
    }
}
