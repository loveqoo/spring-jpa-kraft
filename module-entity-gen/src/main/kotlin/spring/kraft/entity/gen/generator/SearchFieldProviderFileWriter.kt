package spring.kraft.entity.gen.generator

class SearchFieldProviderFileWriter {
    private val stringTypes = ColumnTypeMapper.STRING_TYPES
    private val temporalTypes = ColumnTypeMapper.TEMPORAL_TYPES

    fun write(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val servicePackage = "${metadata.basePackage}.service"
        val entityPackage = "${metadata.basePackage}.entity"
        val cls = metadata.className

        sb.appendLine("package $servicePackage")
        sb.appendLine()
        sb.appendLine("import $entityPackage.$cls")
        sb.appendLine("import org.springframework.data.domain.Sort")
        sb.appendLine("import org.springframework.stereotype.Component")
        sb.appendLine("import spring.kraft.jpa.search.SearchBinder")
        sb.appendLine("import spring.kraft.jpa.search.SearchFieldProvider")
        sb.appendLine("import spring.kraft.jpa.search.SearchOp")
        sb.appendLine()

        sb.appendLine("@Component")
        sb.appendLine("class ${cls}SearchFields : SearchFieldProvider<$cls> {")

        val bindings = buildBindings(metadata)
        if (bindings.isNotEmpty()) {
            sb.appendLine("    override fun customize(binder: SearchBinder<$cls>) {")
            bindings.forEach { (fieldName, op) ->
                sb.appendLine("        binder.bind(\"$fieldName\").to(SearchOp.$op)")
            }
            sb.appendLine("    }")
            sb.appendLine()
        }

        val sortField = findDefaultSortField(metadata)
        if (sortField != null) {
            sb.appendLine("    override fun defaultSort(): Sort = Sort.by(Sort.Direction.DESC, \"$sortField\")")
        }
        sb.appendLine("}")
        sb.appendLine()

        return sb.toString()
    }

    private fun findDefaultSortField(metadata: EntityMetadata): String? {
        val hasCreatedAt =
            metadata.classifiedColumns.any { it.column.name == "created_at" }
        if (hasCreatedAt) return "createdAt"
        val pk = metadata.classifiedColumns.firstOrNull { it.role == ColumnRole.PK }
        return pk?.let { NameConverter.toPropertyName(it.column.name) }
    }

    private fun buildBindings(metadata: EntityMetadata): List<Pair<String, String>> {
        val bindings = mutableListOf<Pair<String, String>>()
        metadata.normalColumns.forEach { classified ->
            val col = classified.column
            val propertyName = NameConverter.toPropertyName(col.name)
            val typeLower = col.typeName.lowercase()
            if (typeLower in stringTypes) {
                bindings.add(propertyName to "LIKE")
            } else if (typeLower in temporalTypes) {
                bindings.add(propertyName to "BETWEEN")
            }
        }
        metadata.classifiedColumns
            .filter { it.role == ColumnRole.SKIP && it.column.typeName.lowercase() in temporalTypes }
            .forEach { classified ->
                val propertyName = NameConverter.toPropertyName(classified.column.name)
                bindings.add(propertyName to "BETWEEN")
            }
        return bindings
    }
}
