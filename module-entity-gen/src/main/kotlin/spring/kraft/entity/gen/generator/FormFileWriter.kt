package spring.kraft.entity.gen.generator

class FormFileWriter {
    fun writeCreateForm(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val formPackage = "${metadata.basePackage}.form"

        sb.appendLine("package $formPackage")
        sb.appendLine()

        val fields = buildCreateFormFields(metadata)
        val imports = collectCreateFormImports(metadata)
        if (imports.isNotEmpty()) {
            imports.sorted().forEach { sb.appendLine("import $it") }
            sb.appendLine()
        }

        sb.appendLine("data class ${metadata.className}CreateForm(")
        fields.forEachIndexed { index, field ->
            val comma = if (index < fields.size - 1) "," else ","
            sb.appendLine("    val ${field.name}: ${field.type}$comma")
        }
        sb.appendLine(")")
        sb.appendLine()

        return sb.toString()
    }

    fun writeUpdateForm(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val formPackage = "${metadata.basePackage}.form"

        sb.appendLine("package $formPackage")
        sb.appendLine()
        sb.appendLine("import spring.kraft.form.UpdateForm")

        val imports = collectUpdateFormImports(metadata)
        if (imports.isNotEmpty()) {
            imports.sorted().forEach { sb.appendLine("import $it") }
        }
        sb.appendLine()

        val fields = buildUpdateFormFields(metadata)

        sb.appendLine("data class ${metadata.className}UpdateForm(")
        sb.appendLine("    override val id: ${metadata.idType},")
        fields.forEach { field ->
            sb.appendLine("    val ${field.name}: ${field.type}?,")
        }
        sb.appendLine(") : UpdateForm<${metadata.idType}>")
        sb.appendLine()

        return sb.toString()
    }

    private fun buildCreateFormFields(metadata: EntityMetadata): List<FormField> {
        val fields = mutableListOf<FormField>()

        metadata.normalColumns.forEach { classified ->
            val col = classified.column
            val kotlinType = ColumnTypeMapper.toKotlinType(col.typeName, col.typeValue)
            fields.add(FormField(NameConverter.toPropertyName(col.name), kotlinType))
        }

        metadata.relations
            .filter { it.type == "ManyToOne" || it.type == "OneToOne" }
            .forEach { rel ->
                val fieldName = NameConverter.toPropertyName(rel.joinColumnName)
                val type = if (rel.nullable) "${rel.targetIdType}?" else rel.targetIdType
                fields.add(FormField(fieldName, type))
            }

        return fields
    }

    private fun buildUpdateFormFields(metadata: EntityMetadata): List<FormField> {
        val fields = mutableListOf<FormField>()

        metadata.normalColumns.forEach { classified ->
            val col = classified.column
            val kotlinType = ColumnTypeMapper.toKotlinType(col.typeName, col.typeValue)
            fields.add(FormField(NameConverter.toPropertyName(col.name), kotlinType))
        }

        metadata.relations
            .filter { it.type == "ManyToOne" || it.type == "OneToOne" }
            .forEach { rel ->
                val fieldName = NameConverter.toPropertyName(rel.joinColumnName)
                fields.add(FormField(fieldName, rel.targetIdType))
            }

        return fields
    }

    private fun collectCreateFormImports(metadata: EntityMetadata): Set<String> {
        val imports = mutableSetOf<String>()
        metadata.normalColumns.forEach { classified ->
            val imp = ColumnTypeMapper.requiredImport(classified.column.typeName, classified.column.typeValue)
            if (imp != null) imports.add(imp)
        }
        return imports
    }

    private fun collectUpdateFormImports(metadata: EntityMetadata): Set<String> {
        val imports = mutableSetOf<String>()
        metadata.normalColumns.forEach { classified ->
            val imp = ColumnTypeMapper.requiredImport(classified.column.typeName, classified.column.typeValue)
            if (imp != null) imports.add(imp)
        }
        return imports
    }

    private data class FormField(
        val name: String,
        val type: String,
    )
}
