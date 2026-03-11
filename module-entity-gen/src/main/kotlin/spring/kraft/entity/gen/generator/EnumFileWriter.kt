package spring.kraft.entity.gen.generator

class EnumFileWriter {
    private val kotlinIdentifierRegex = Regex("^[A-Za-z_][A-Za-z0-9_]*$")

    fun write(
        packageName: String,
        enumName: String,
        values: List<String>,
    ): String {
        require(kotlinIdentifierRegex.matches(enumName)) {
            "Invalid enum name '$enumName': must be a valid Kotlin identifier"
        }
        values.forEach { value ->
            require(kotlinIdentifierRegex.matches(value)) {
                "Invalid enum value '$value' in '$enumName': must be a valid Kotlin identifier"
            }
        }

        val sb = StringBuilder()
        sb.appendLine("package $packageName")
        sb.appendLine()
        sb.appendLine("enum class $enumName {")
        values.forEach { value ->
            sb.appendLine("    $value,")
        }
        sb.appendLine("}")
        sb.appendLine()
        return sb.toString()
    }
}
