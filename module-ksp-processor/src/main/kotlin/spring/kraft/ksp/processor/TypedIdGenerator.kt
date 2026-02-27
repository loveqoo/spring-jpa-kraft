package spring.kraft.ksp.processor

import com.google.devtools.ksp.processing.CodeGenerator
import com.google.devtools.ksp.processing.Dependencies
import com.google.devtools.ksp.symbol.KSType
import java.io.OutputStreamWriter

class TypedIdGenerator(
    private val codeGenerator: CodeGenerator,
) {
    fun generate(
        basePackage: String,
        entityName: String,
        idType: KSType,
        originatingFile: com.google.devtools.ksp.symbol.KSFile?,
    ) {
        val idPackage = "$basePackage.id"
        val idClassName = "${entityName}Id"
        val primitiveTypeName = idType.declaration.simpleName.asString()

        val dependencies =
            if (originatingFile != null) {
                Dependencies(aggregating = false, originatingFile)
            } else {
                Dependencies(aggregating = false)
            }

        val file = codeGenerator.createNewFile(dependencies, idPackage, idClassName)
        OutputStreamWriter(file).use { writer ->
            writer.write("package $idPackage\n\n")
            writer.write("@JvmInline\n")
            writer.write("value class $idClassName(val value: $primitiveTypeName) : Comparable<$idClassName> {\n")
            writer.write("    override fun compareTo(other: $idClassName): Int = value.compareTo(other.value)\n")
            writer.write("}\n\n")
            writer.write("fun $primitiveTypeName.to$idClassName(): $idClassName = $idClassName(this)\n")
        }
    }
}
