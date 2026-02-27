package spring.kraft.ksp.processor

import com.google.devtools.ksp.processing.CodeGenerator
import com.google.devtools.ksp.processing.Dependencies
import com.google.devtools.ksp.symbol.KSFile
import com.google.devtools.ksp.symbol.KSFunctionDeclaration
import com.google.devtools.ksp.symbol.KSType
import com.google.devtools.ksp.symbol.KSTypeArgument
import com.google.devtools.ksp.symbol.Variance
import java.io.OutputStreamWriter

class InternalMediatorGenerator(
    private val codeGenerator: CodeGenerator,
) {
    companion object {
        private val VERB_PREFIXES =
            listOf(
                "find",
                "get",
                "search",
                "count",
                "exists",
                "is",
                "has",
                "delete",
                "remove",
                "create",
                "update",
                "save",
            )
        private val SKIP_IMPORT_PACKAGES =
            setOf(
                "kotlin",
                "kotlin.collections",
                "kotlin.text",
                "java.lang",
            )
    }

    fun generate(
        basePackage: String,
        rootSimpleName: String,
        entries: List<ServiceEntry>,
        mediatorPackageOverride: String? = null,
    ) {
        val mediatorPackage = mediatorPackageOverride ?: "$basePackage.mediator"
        val idPackage = "$basePackage.id"

        val originatingFiles = entries.mapNotNull { it.classDeclaration.containingFile }
        val dependencies =
            if (originatingFiles.isNotEmpty()) {
                Dependencies(aggregating = true, *originatingFiles.toTypedArray<KSFile>())
            } else {
                Dependencies(aggregating = true)
            }

        entries.forEach { entry ->
            generateInterface(mediatorPackage, idPackage, entry, entries, dependencies)
        }

        generateAggregateClass(mediatorPackage, idPackage, rootSimpleName, entries, dependencies)
    }

    private fun generateInterface(
        mediatorPackage: String,
        idPackage: String,
        currentEntry: ServiceEntry,
        allEntries: List<ServiceEntry>,
        dependencies: Dependencies,
    ) {
        val interfaceName = "${currentEntry.entityName}InternalMediator"
        val otherEntries = allEntries.filter { it.entityName != currentEntry.entityName }

        val file = codeGenerator.createNewFile(dependencies, mediatorPackage, interfaceName)
        OutputStreamWriter(file).use { writer ->
            writer.write("package $mediatorPackage\n\n")

            val imports = buildInterfaceImports(idPackage, otherEntries)
            imports.forEach { writer.write("import $it\n") }
            if (imports.isNotEmpty()) writer.write("\n")

            writer.write("interface $interfaceName {\n")

            otherEntries.forEach { entry ->
                generateReadMethodSignatures(writer, entry)
                if (entry.customMethods.isNotEmpty()) {
                    generateCustomMethodSignatures(writer, entry)
                }
            }

            writer.write("}\n")
        }
    }

    private fun generateAggregateClass(
        mediatorPackage: String,
        idPackage: String,
        rootSimpleName: String,
        entries: List<ServiceEntry>,
        dependencies: Dependencies,
    ) {
        val className = "${rootSimpleName}AggregateMediator"
        val interfaceNames = entries.map { "${it.entityName}InternalMediator" }

        val file = codeGenerator.createNewFile(dependencies, mediatorPackage, className)
        OutputStreamWriter(file).use { writer ->
            writer.write("package $mediatorPackage\n\n")

            val imports = buildClassImports(idPackage, entries)
            imports.forEach { writer.write("import $it\n") }
            if (imports.isNotEmpty()) writer.write("\n")

            val implementsClause =
                if (interfaceNames.isNotEmpty()) " : ${interfaceNames.joinToString(", ")}" else ""
            writer.write("open class $className(\n")
            entries.forEachIndexed { index, entry ->
                val serviceVarName = serviceVarName(entry)
                val serviceQualifiedName =
                    entry.classDeclaration.qualifiedName
                        ?.asString() ?: return@forEachIndexed
                val lazy = "@org.springframework.context.annotation.Lazy"
                writer.write(
                    "    $lazy protected val $serviceVarName: $serviceQualifiedName,\n",
                )
            }
            writer.write(")$implementsClause {\n")

            entries.forEach { entry ->
                val otherEntries = entries.filter { it.entityName != entry.entityName }
                if (otherEntries.isNotEmpty() || entry.customMethods.isNotEmpty()) {
                    writer.write("\n")
                    writer.write("    // --- ${entry.entityName} (for ${entry.entityName}InternalMediator) ---\n")
                }
                otherEntries.forEach { otherEntry ->
                    // This entry's interface provides methods to access OTHER entries
                    // But the class groups by target entity for readability
                }
            }

            // Generate override methods grouped by target entity
            entries.forEach { targetEntry ->
                val hasMethodsForTarget = entries.any { it.entityName != targetEntry.entityName }
                if (hasMethodsForTarget || targetEntry.customMethods.isNotEmpty()) {
                    writer.write("\n")
                    writer.write("    // --- ${targetEntry.entityName} ---\n")
                    generateReadMethodOverrides(writer, targetEntry)
                    if (targetEntry.customMethods.isNotEmpty()) {
                        generateCustomMethodOverrides(writer, targetEntry)
                    }
                }
            }

            writer.write("}\n")
        }
    }

    private fun buildInterfaceImports(
        idPackage: String,
        otherEntries: List<ServiceEntry>,
    ): List<String> {
        val imports = mutableSetOf<String>()

        val hasFindAll = otherEntries.any { "FIND_ALL" !in it.excludedMethods }
        if (hasFindAll) {
            imports.add("org.springframework.data.domain.Page")
            imports.add("org.springframework.data.domain.Pageable")
        }

        otherEntries.forEach { entry ->
            imports.add("$idPackage.${entry.entityName}Id")
            resolveQualifiedName(entry.entityType)?.let { imports.add(it) }

            entry.customMethods.forEach { customMethod ->
                collectFunctionImports(customMethod.declaration, imports)
            }
        }

        return imports.sorted()
    }

    private fun buildClassImports(
        idPackage: String,
        entries: List<ServiceEntry>,
    ): List<String> {
        val imports = mutableSetOf<String>()

        val hasFindAll = entries.any { entry -> "FIND_ALL" !in entry.excludedMethods }
        if (hasFindAll) {
            imports.add("org.springframework.data.domain.Page")
            imports.add("org.springframework.data.domain.Pageable")
        }

        entries.forEach { entry ->
            imports.add("$idPackage.${entry.entityName}Id")
            resolveQualifiedName(entry.entityType)?.let { imports.add(it) }
            entry.classDeclaration.qualifiedName
                ?.asString()
                ?.let { imports.add(it) }

            entry.customMethods.forEach { customMethod ->
                collectFunctionImports(customMethod.declaration, imports)
            }
        }

        return imports.sorted()
    }

    private fun collectFunctionImports(
        funcDecl: KSFunctionDeclaration,
        imports: MutableSet<String>,
    ) {
        funcDecl.returnType?.resolve()?.let { collectTypeImports(it, imports) }
        funcDecl.parameters.forEach { param ->
            param.type.resolve().let { collectTypeImports(it, imports) }
        }
    }

    private fun collectTypeImports(
        type: KSType,
        imports: MutableSet<String>,
    ) {
        val pkg =
            type.declaration.packageName
                .asString()
        if (pkg !in SKIP_IMPORT_PACKAGES) {
            resolveQualifiedName(type)?.let { imports.add(it) }
        }
        type.arguments.forEach { arg ->
            arg.type?.resolve()?.let { collectTypeImports(it, imports) }
        }
    }

    private fun resolveQualifiedName(type: KSType): String? =
        type.declaration.qualifiedName
            ?.asString()

    private fun generateReadMethodSignatures(
        writer: OutputStreamWriter,
        entry: ServiceEntry,
    ) {
        val entityName = entry.entityName
        val idClass = "${entry.entityName}Id"
        val entitySimple =
            entry.entityType.declaration.simpleName
                .asString()

        if ("FIND_BY_ID" !in entry.excludedMethods) {
            writer.write(
                "    fun find${entityName}ById(id: $idClass): $entitySimple?\n\n",
            )
        }
        if ("GET_ONE" !in entry.excludedMethods) {
            writer.write(
                "    fun getOne$entityName(id: $idClass): $entitySimple\n\n",
            )
        }
        if ("FIND_ALL" !in entry.excludedMethods) {
            writer.write(
                "    fun findAll$entityName(pageable: Pageable): Page<$entitySimple>\n\n",
            )
        }
    }

    private fun generateCustomMethodSignatures(
        writer: OutputStreamWriter,
        entry: ServiceEntry,
    ) {
        val entityName = entry.entityName

        entry.customMethods.forEach { customMethod ->
            val funcDecl = customMethod.declaration
            val originalName = funcDecl.simpleName.asString()
            val methodName = resolveCustomMethodName(originalName, entityName, customMethod.overrideName)

            val params =
                funcDecl.parameters.joinToString(", ") { param ->
                    val paramName = param.name?.asString() ?: "_"
                    val paramType = renderType(param.type.resolve())
                    "$paramName: $paramType"
                }

            val returnType = funcDecl.returnType?.resolve()
            val returnTypeSuffix =
                if (returnType != null) {
                    ": ${renderType(returnType)}"
                } else {
                    ""
                }

            val suspendPrefix = if (customMethod.isSuspend) "suspend " else ""
            writer.write(
                "    ${suspendPrefix}fun $methodName($params)$returnTypeSuffix\n\n",
            )
        }
    }

    private fun generateReadMethodOverrides(
        writer: OutputStreamWriter,
        entry: ServiceEntry,
    ) {
        val serviceVar = serviceVarName(entry)
        val entityName = entry.entityName
        val idClass = "${entry.entityName}Id"
        val entitySimple =
            entry.entityType.declaration.simpleName
                .asString()

        if ("FIND_BY_ID" !in entry.excludedMethods) {
            writer.write(
                "    override fun find${entityName}ById(id: $idClass): $entitySimple? = $serviceVar.findById(id.value)\n\n",
            )
        }
        if ("GET_ONE" !in entry.excludedMethods) {
            writer.write(
                "    override fun getOne$entityName(id: $idClass): $entitySimple = $serviceVar.getOne(id.value)\n\n",
            )
        }
        if ("FIND_ALL" !in entry.excludedMethods) {
            writer.write(
                "    override fun findAll$entityName(pageable: Pageable): Page<$entitySimple> = $serviceVar.findAll(pageable)\n\n",
            )
        }
    }

    private fun generateCustomMethodOverrides(
        writer: OutputStreamWriter,
        entry: ServiceEntry,
    ) {
        val serviceVar = serviceVarName(entry)
        val entityName = entry.entityName

        entry.customMethods.forEach { customMethod ->
            val funcDecl = customMethod.declaration
            val originalName = funcDecl.simpleName.asString()
            val methodName = resolveCustomMethodName(originalName, entityName, customMethod.overrideName)

            val params =
                funcDecl.parameters.joinToString(", ") { param ->
                    val paramName = param.name?.asString() ?: "_"
                    val paramType = renderType(param.type.resolve())
                    "$paramName: $paramType"
                }

            val args =
                funcDecl.parameters.joinToString(", ") { param ->
                    param.name?.asString() ?: "_"
                }

            val returnType = funcDecl.returnType?.resolve()
            val returnTypeSuffix =
                if (returnType != null) {
                    ": ${renderType(returnType)}"
                } else {
                    ""
                }

            val suspendPrefix = if (customMethod.isSuspend) "suspend " else ""
            writer.write(
                "    override ${suspendPrefix}fun $methodName($params)$returnTypeSuffix = $serviceVar.$originalName($args)\n\n",
            )
        }
    }

    internal fun resolveCustomMethodName(
        originalName: String,
        entityName: String,
        overrideName: String,
    ): String {
        if (overrideName.isNotEmpty()) return overrideName

        for (verb in VERB_PREFIXES) {
            if (originalName.startsWith(verb) && originalName.length > verb.length) {
                val afterVerb = originalName.substring(verb.length)
                return "$verb$entityName$afterVerb"
            }
        }

        val entityLower = entityName.replaceFirstChar { it.lowercase() }
        val originalCapitalized = originalName.replaceFirstChar { it.uppercase() }
        return "$entityLower$originalCapitalized"
    }

    internal fun renderType(type: KSType): String {
        val simpleName = type.declaration.simpleName.asString()
        val nullable = if (type.isMarkedNullable) "?" else ""

        if (type.arguments.isEmpty()) {
            return "$simpleName$nullable"
        }

        val typeArgs =
            type.arguments.joinToString(", ") { arg ->
                renderTypeArgument(arg)
            }
        return "$simpleName<$typeArgs>$nullable"
    }

    private fun renderTypeArgument(arg: KSTypeArgument): String {
        val type = arg.type?.resolve() ?: return "*"
        return when (arg.variance) {
            Variance.STAR -> "*"
            Variance.INVARIANT -> renderType(type)
            Variance.COVARIANT -> "out ${renderType(type)}"
            Variance.CONTRAVARIANT -> "in ${renderType(type)}"
        }
    }

    private fun serviceVarName(entry: ServiceEntry): String {
        val simpleName = entry.classDeclaration.simpleName.asString()
        return simpleName.replaceFirstChar { it.lowercase() }
    }
}
