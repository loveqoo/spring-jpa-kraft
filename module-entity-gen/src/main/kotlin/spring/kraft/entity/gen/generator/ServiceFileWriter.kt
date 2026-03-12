package spring.kraft.entity.gen.generator

import spring.kraft.entity.gen.config.EntityMode

class ServiceFileWriter {
    fun write(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val cls = metadata.className
        val isLongId = metadata.idType == "Long"
        val mode = metadata.entityMode
        val variant = resolveVariant(mode)

        sb.appendLine("package ${metadata.basePackage}")
        sb.appendLine()

        sb.appendLine("import org.springframework.stereotype.Service")
        collectImports(isLongId, variant, metadata).sorted().forEach {
            sb.appendLine("import $it")
        }
        sb.appendLine()

        sb.appendLine("@Service")
        sb.appendLine("class ${cls}Service(")
        sb.appendLine("    override val repo: ${cls}Repository,")

        if (variant != ServiceVariant.READ_ONLY) {
            if (isLongId) {
                sb.appendLine("    override val formResolver: LongFormResolver<$cls, ${cls}CreateForm, ${cls}UpdateForm>,")
            } else {
                sb.appendLine("    override val formResolver: FormResolver<${metadata.idType}, $cls, ${cls}CreateForm, ${cls}UpdateForm>,")
            }
        }

        if (variant == ServiceVariant.SEARCHABLE || variant == ServiceVariant.SEARCHABLE_REVISION) {
            sb.appendLine("    override val searchFieldProvider: SearchFieldProvider<$cls>,")
        }

        sb.append(") : ")
        sb.appendLine("${buildSuperType(isLongId, variant, metadata)} {")
        sb.appendLine("    override val tableName: String = \"${metadata.tableName}\"")
        sb.appendLine("}")
        sb.appendLine()

        return sb.toString()
    }

    private fun collectImports(
        isLongId: Boolean,
        variant: ServiceVariant,
        metadata: EntityMetadata,
    ): Set<String> {
        val imports = mutableSetOf<String>()
        val cls = metadata.className

        when (variant) {
            ServiceVariant.READ_ONLY -> {
                if (isLongId) {
                    imports.add("spring.kraft.LongReadOnlyEntityService")
                } else {
                    imports.add("spring.kraft.service.ReadOnlyEntityService")
                }
            }
            ServiceVariant.BASE -> {
                if (isLongId) {
                    imports.add("spring.kraft.LongBaseEntityService")
                    imports.add("spring.kraft.LongFormResolver")
                } else {
                    imports.add("spring.kraft.service.BaseEntityService")
                    imports.add("spring.kraft.form.FormResolver")
                }
            }
            ServiceVariant.SEARCHABLE -> {
                if (isLongId) {
                    imports.add("spring.kraft.LongSearchableEntityService")
                    imports.add("spring.kraft.LongFormResolver")
                } else {
                    imports.add("spring.kraft.service.SearchableEntityService")
                    imports.add("spring.kraft.form.FormResolver")
                }
                imports.add("spring.kraft.jpa.search.SearchFieldProvider")
            }
            ServiceVariant.REVISION -> {
                if (isLongId) {
                    imports.add("spring.kraft.LongRevisionEntityService")
                    imports.add("spring.kraft.LongFormResolver")
                } else {
                    imports.add("spring.kraft.service.RevisionEntityService")
                    imports.add("spring.kraft.form.FormResolver")
                }
            }
            ServiceVariant.SEARCHABLE_REVISION -> {
                if (isLongId) {
                    imports.add("spring.kraft.LongSearchableRevisionEntityService")
                    imports.add("spring.kraft.LongFormResolver")
                } else {
                    imports.add("spring.kraft.service.SearchableRevisionEntityService")
                    imports.add("spring.kraft.form.FormResolver")
                }
                imports.add("spring.kraft.jpa.search.SearchFieldProvider")
            }
        }

        return imports
    }

    private fun buildSuperType(
        isLongId: Boolean,
        variant: ServiceVariant,
        metadata: EntityMetadata,
    ): String {
        val cls = metadata.className
        val idType = metadata.idType
        return when (variant) {
            ServiceVariant.READ_ONLY -> {
                if (isLongId) {
                    "LongReadOnlyEntityService<$cls>"
                } else {
                    "ReadOnlyEntityService<$idType, $cls>"
                }
            }
            ServiceVariant.BASE -> {
                if (isLongId) {
                    "LongBaseEntityService<$cls, ${cls}CreateForm, ${cls}UpdateForm>"
                } else {
                    "BaseEntityService<$idType, $cls, ${cls}CreateForm, ${cls}UpdateForm>"
                }
            }
            ServiceVariant.SEARCHABLE -> {
                if (isLongId) {
                    "LongSearchableEntityService<$cls, ${cls}Repository, ${cls}CreateForm, ${cls}UpdateForm>"
                } else {
                    "SearchableEntityService<$idType, $cls, ${cls}Repository, ${cls}CreateForm, ${cls}UpdateForm>"
                }
            }
            ServiceVariant.REVISION -> {
                if (isLongId) {
                    "LongRevisionEntityService<$cls, ${cls}Repository, ${cls}CreateForm, ${cls}UpdateForm>"
                } else {
                    "RevisionEntityService<$idType, $cls, ${cls}Repository, ${cls}CreateForm, ${cls}UpdateForm>"
                }
            }
            ServiceVariant.SEARCHABLE_REVISION -> {
                if (isLongId) {
                    "LongSearchableRevisionEntityService<$cls, ${cls}Repository, ${cls}CreateForm, ${cls}UpdateForm>"
                } else {
                    "SearchableRevisionEntityService<$idType, $cls, ${cls}Repository, ${cls}CreateForm, ${cls}UpdateForm>"
                }
            }
        }
    }

    companion object {
        fun resolveVariant(mode: EntityMode): ServiceVariant =
            when {
                mode.readOnly -> ServiceVariant.READ_ONLY
                !mode.searchable && !mode.revision -> ServiceVariant.BASE
                mode.searchable && !mode.revision -> ServiceVariant.SEARCHABLE
                !mode.searchable && mode.revision -> ServiceVariant.REVISION
                else -> ServiceVariant.SEARCHABLE_REVISION
            }
    }
}

enum class ServiceVariant {
    READ_ONLY,
    BASE,
    SEARCHABLE,
    REVISION,
    SEARCHABLE_REVISION,
}
