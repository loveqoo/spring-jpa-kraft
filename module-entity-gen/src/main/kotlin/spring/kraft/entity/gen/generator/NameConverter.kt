package spring.kraft.entity.gen.generator

object NameConverter {
    private val KEEP_TRAILING_S = Regex(".*(ss|us|is)$", RegexOption.IGNORE_CASE)

    fun toClassName(tableName: String): String = singularize(toPascalCase(tableName))

    fun toPropertyName(columnName: String): String = toCamelCase(columnName)

    fun toPascalCase(snake: String): String =
        snake
            .split("_")
            .joinToString("") { segment ->
                segment.replaceFirstChar { it.uppercaseChar() }
            }

    fun toDisplayName(tableName: String): String =
        tableName
            .split("_")
            .joinToString(" ") { segment ->
                segment.replaceFirstChar { it.uppercaseChar() }
            }

    fun toCamelCase(snake: String): String {
        val pascal = toPascalCase(snake)
        return pascal.replaceFirstChar { it.lowercaseChar() }
    }

    private fun singularize(name: String): String {
        if (name.length <= 1) return name
        if (KEEP_TRAILING_S.matches(name)) return name
        if (name.endsWith("ies")) {
            return name.dropLast(3) + "y"
        }
        if (name.endsWith("ses") ||
            name.endsWith("xes") ||
            name.endsWith("zes") ||
            name.endsWith("ches") ||
            name.endsWith("shes")
        ) {
            return name.dropLast(2)
        }
        if (name.endsWith("s")) {
            return name.dropLast(1)
        }
        return name
    }
}
