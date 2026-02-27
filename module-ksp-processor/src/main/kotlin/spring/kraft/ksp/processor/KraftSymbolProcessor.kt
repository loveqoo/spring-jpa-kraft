package spring.kraft.ksp.processor

import com.google.devtools.ksp.getDeclaredFunctions
import com.google.devtools.ksp.processing.KSPLogger
import com.google.devtools.ksp.processing.Resolver
import com.google.devtools.ksp.processing.SymbolProcessor
import com.google.devtools.ksp.processing.SymbolProcessorEnvironment
import com.google.devtools.ksp.symbol.KSAnnotated
import com.google.devtools.ksp.symbol.KSClassDeclaration
import com.google.devtools.ksp.symbol.KSType
import com.google.devtools.ksp.symbol.KSTypeParameter
import com.google.devtools.ksp.symbol.Modifier

class KraftSymbolProcessor(
    private val environment: SymbolProcessorEnvironment,
) : SymbolProcessor {
    companion object {
        private const val ANNOTATION_FQN = "spring.kraft.ksp.annotation.KraftAggregate"
        private const val EXPOSE_ANNOTATION_FQN = "spring.kraft.ksp.annotation.KraftExpose"
        private const val BASE_ENTITY_SERVICE_FQN = "spring.kraft.service.BaseEntityService"
        private const val READ_ONLY_SERVICE_FQN = "spring.kraft.service.ReadOnlyEntityService"
    }

    private val logger: KSPLogger = environment.logger
    private var processed = false

    override fun process(resolver: Resolver): List<KSAnnotated> {
        if (processed) return emptyList()
        processed = true

        val symbols = resolver.getSymbolsWithAnnotation(ANNOTATION_FQN)
        val entries =
            symbols
                .filterIsInstance<KSClassDeclaration>()
                .mapNotNull { classDecl -> extractServiceEntry(classDecl) }
                .toList()

        if (entries.isEmpty()) return emptyList()

        val groupedByRoot =
            entries.groupBy { entry ->
                entry.rootType.declaration.qualifiedName
                    ?.asString() ?: ""
            }

        val typedIdGenerator = TypedIdGenerator(environment.codeGenerator)
        val mediatorGenerator = InternalMediatorGenerator(environment.codeGenerator)

        val generatedIds = mutableSetOf<String>()

        groupedByRoot.forEach { (_, groupEntries) ->
            val rootType = groupEntries.first().rootType
            val rootSimpleName = rootType.declaration.simpleName.asString()
            val rootPackage = rootType.declaration.packageName.asString()
            val basePackage = rootPackage.substringBeforeLast(".")

            groupEntries.forEach { entry ->
                val idTypeFqn =
                    entry.idType.declaration.qualifiedName
                        ?.asString() ?: ""
                val idKey = "$basePackage.id.${entry.entityName}Id[$idTypeFqn]"
                if (idKey !in generatedIds) {
                    generatedIds.add(idKey)
                    typedIdGenerator.generate(
                        basePackage = basePackage,
                        entityName = entry.entityName,
                        idType = entry.idType,
                        originatingFile = entry.classDeclaration.containingFile,
                    )
                }
            }

            val mediatorPackageOverride = resolveMediatorPackage(groupEntries, rootSimpleName)
            if (mediatorPackageOverride == null && hasMediatorPackageConflict(groupEntries)) {
                return@forEach
            }

            mediatorGenerator.generate(
                basePackage = basePackage,
                rootSimpleName = rootSimpleName,
                entries = groupEntries,
                mediatorPackageOverride = mediatorPackageOverride,
            )
        }

        return emptyList()
    }

    private fun resolveMediatorPackage(
        groupEntries: List<ServiceEntry>,
        rootSimpleName: String,
    ): String? {
        val explicitPackages =
            groupEntries
                .map { it.mediatorPackage }
                .filter { it.isNotEmpty() }
                .toSet()

        if (explicitPackages.isEmpty()) return null
        if (explicitPackages.size == 1) return explicitPackages.first()
        return null
    }

    private fun hasMediatorPackageConflict(groupEntries: List<ServiceEntry>): Boolean {
        val explicitPackages =
            groupEntries
                .map { it.mediatorPackage }
                .filter { it.isNotEmpty() }
                .toSet()

        if (explicitPackages.size > 1) {
            val rootName =
                groupEntries
                    .first()
                    .rootType.declaration.simpleName
                    .asString()
            logger.error(
                "Conflicting mediatorPackage values for root '$rootName': $explicitPackages. Skipping mediator generation.",
            )
            return true
        }
        return false
    }

    private fun extractServiceEntry(classDecl: KSClassDeclaration): ServiceEntry? {
        val annotation =
            classDecl.annotations.firstOrNull {
                val fqn =
                    it.annotationType
                        .resolve()
                        .declaration.qualifiedName
                        ?.asString()
                fqn == ANNOTATION_FQN
            } ?: return null

        val rootArg =
            annotation.arguments.firstOrNull {
                it.name?.asString() == "root"
            } ?: return null
        val rootType = rootArg.value as? KSType ?: return null

        val excludedMethods = extractExcludedMethods(annotation)
        val mediatorPackage = extractMediatorPackage(annotation)
        val customMethods = extractCustomMethods(classDecl)

        val baseEntityResult = findSupertypeArgs(classDecl, BASE_ENTITY_SERVICE_FQN)
        if (baseEntityResult != null) {
            if (baseEntityResult.size < 4) return null
            val idType = baseEntityResult[0]
            val entityType = baseEntityResult[1]
            val createFormType = baseEntityResult[2]
            val updateFormType = baseEntityResult[3]
            return ServiceEntry(
                classDeclaration = classDecl,
                rootType = rootType,
                entityName = entityType.declaration.simpleName.asString(),
                idType = idType,
                entityType = entityType,
                createFormType = createFormType,
                updateFormType = updateFormType,
                isMutable = true,
                excludedMethods = excludedMethods,
                customMethods = customMethods,
                mediatorPackage = mediatorPackage,
            )
        }

        val readOnlyResult = findSupertypeArgs(classDecl, READ_ONLY_SERVICE_FQN)
        if (readOnlyResult != null) {
            if (readOnlyResult.size < 2) return null
            val idType = readOnlyResult[0]
            val entityType = readOnlyResult[1]
            return ServiceEntry(
                classDeclaration = classDecl,
                rootType = rootType,
                entityName = entityType.declaration.simpleName.asString(),
                idType = idType,
                entityType = entityType,
                createFormType = null,
                updateFormType = null,
                isMutable = false,
                excludedMethods = excludedMethods,
                customMethods = customMethods,
                mediatorPackage = mediatorPackage,
            )
        }

        return null
    }

    private fun extractExcludedMethods(annotation: com.google.devtools.ksp.symbol.KSAnnotation): Set<String> {
        val excludeArg =
            annotation.arguments.firstOrNull {
                it.name?.asString() == "exclude"
            } ?: return emptySet()

        val values = excludeArg.value as? List<*> ?: return emptySet()
        return values
            .mapNotNull { value ->
                when (value) {
                    is KSType -> value.declaration.simpleName.asString()
                    is KSClassDeclaration -> value.simpleName.asString()
                    else -> null
                }
            }.toSet()
    }

    private fun extractMediatorPackage(annotation: com.google.devtools.ksp.symbol.KSAnnotation): String {
        val arg =
            annotation.arguments.firstOrNull {
                it.name?.asString() == "mediatorPackage"
            } ?: return ""
        return arg.value as? String ?: ""
    }

    private fun extractCustomMethods(classDecl: KSClassDeclaration): List<CustomMethodEntry> {
        return classDecl
            .getDeclaredFunctions()
            .mapNotNull { funcDecl ->
                val exposeAnnotation =
                    funcDecl.annotations.firstOrNull {
                        val fqn =
                            it.annotationType
                                .resolve()
                                .declaration.qualifiedName
                                ?.asString()
                        fqn == EXPOSE_ANNOTATION_FQN
                    } ?: return@mapNotNull null

                val nameArg =
                    exposeAnnotation.arguments.firstOrNull {
                        it.name?.asString() == "name"
                    }
                val overrideName = (nameArg?.value as? String) ?: ""

                CustomMethodEntry(
                    declaration = funcDecl,
                    overrideName = overrideName,
                    isSuspend = Modifier.SUSPEND in funcDecl.modifiers,
                )
            }.toList()
    }

    private fun findSupertypeArgs(
        classDecl: KSClassDeclaration,
        targetFqn: String,
    ): List<KSType>? {
        for (superTypeRef in classDecl.superTypes) {
            val resolved = superTypeRef.resolve()
            val fqn =
                resolved.declaration.qualifiedName
                    ?.asString()
            if (fqn == targetFqn) {
                return resolved.arguments.mapNotNull { it.type?.resolve() }
            }
            val superDecl = resolved.declaration as? KSClassDeclaration ?: continue
            val found = findSupertypeArgs(superDecl, targetFqn) ?: continue
            val paramMapping = buildTypeParamMapping(superDecl, resolved)
            return found.map { type -> substituteType(type, paramMapping) }
        }
        return null
    }

    private fun buildTypeParamMapping(
        superDecl: KSClassDeclaration,
        resolvedType: KSType,
    ): Map<String, KSType> {
        val mapping = mutableMapOf<String, KSType>()
        superDecl.typeParameters.forEachIndexed { index, typeParam ->
            val actualArg =
                resolvedType.arguments
                    .getOrNull(index)
                    ?.type
                    ?.resolve()
            if (actualArg != null) {
                mapping[typeParam.name.asString()] = actualArg
            }
        }
        return mapping
    }

    private fun substituteType(
        type: KSType,
        mapping: Map<String, KSType>,
    ): KSType {
        if (type.declaration is KSTypeParameter) {
            return mapping[type.declaration.simpleName.asString()] ?: type
        }
        return type
    }
}
