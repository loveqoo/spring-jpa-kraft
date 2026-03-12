package spring.kraft.entity.gen.generator

class ControllerFileWriter {
    fun write(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val cls = metadata.className
        val isLongId = metadata.idType == "Long"
        val displayName = NameConverter.toDisplayName(metadata.tableName)
        val variant = ServiceFileWriter.resolveVariant(metadata.entityMode)

        sb.appendLine("package ${metadata.basePackage}")
        sb.appendLine()

        // imports
        collectImports(isLongId, variant, metadata).sorted().forEach {
            sb.appendLine("import $it")
        }
        sb.appendLine()

        // class declaration
        sb.appendLine("@Tag(name = \"$displayName\")")
        sb.appendLine("@RestController")
        sb.appendLine("@RequestMapping(\"/api/${metadata.tableName}\")")
        sb.appendLine("class ${cls}Controller(")
        sb.appendLine("    override val service: ${cls}Service,")
        sb.appendLine(") : ${buildSuperType(isLongId, variant, metadata)}() {")
        sb.appendLine("    override val tableName: String = \"${metadata.tableName}\"")
        sb.appendLine()

        // API methods based on variant
        when (variant) {
            ServiceVariant.READ_ONLY -> {
                appendListMethod(sb, cls, displayName)
                appendGetOneMethod(sb, cls, metadata.idType, displayName)
            }
            ServiceVariant.BASE -> {
                appendListMethod(sb, cls, displayName)
                appendGetOneMethod(sb, cls, metadata.idType, displayName)
                appendCrudMethods(sb, cls, metadata.idType, displayName)
            }
            ServiceVariant.SEARCHABLE -> {
                appendSearchMethod(sb, cls, displayName)
                appendGetOneMethod(sb, cls, metadata.idType, displayName)
                appendCrudMethods(sb, cls, metadata.idType, displayName)
            }
            ServiceVariant.REVISION -> {
                appendListMethod(sb, cls, displayName)
                appendGetOneMethod(sb, cls, metadata.idType, displayName)
                appendCrudMethods(sb, cls, metadata.idType, displayName)
                appendRevisionMethods(sb, cls, metadata.idType, displayName)
            }
            ServiceVariant.SEARCHABLE_REVISION -> {
                appendSearchMethod(sb, cls, displayName)
                appendGetOneMethod(sb, cls, metadata.idType, displayName)
                appendCrudMethods(sb, cls, metadata.idType, displayName)
                appendRevisionMethods(sb, cls, metadata.idType, displayName)
            }
        }

        // toReadDto
        appendToDtoMethod(sb, "toReadDto", metadata)

        // toRevisionDto (only for Revision variants)
        if (variant == ServiceVariant.REVISION || variant == ServiceVariant.SEARCHABLE_REVISION) {
            sb.appendLine()
            appendToDtoMethod(sb, "toRevisionDto", metadata)
        }

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

        imports.add("io.swagger.v3.oas.annotations.Operation")
        imports.add("io.swagger.v3.oas.annotations.tags.Tag")
        imports.add("org.springframework.data.domain.Page")
        imports.add("org.springframework.data.domain.Pageable")
        imports.add("org.springframework.web.bind.annotation.GetMapping")
        imports.add("org.springframework.web.bind.annotation.PathVariable")
        imports.add("org.springframework.web.bind.annotation.RequestMapping")
        imports.add("org.springframework.web.bind.annotation.RestController")
        imports.add("spring.kraft.core.toYmdHms")

        if (variant != ServiceVariant.READ_ONLY) {
            imports.add("org.springframework.validation.Errors")
            imports.add("org.springframework.web.bind.annotation.DeleteMapping")
            imports.add("org.springframework.web.bind.annotation.PostMapping")
            imports.add("org.springframework.web.bind.annotation.PutMapping")
            imports.add("org.springframework.web.bind.annotation.RequestBody")
            imports.add("spring.kraft.controller.dto.MutationResponse")
        }

        if (variant == ServiceVariant.SEARCHABLE || variant == ServiceVariant.SEARCHABLE_REVISION) {
            imports.add("org.springframework.web.bind.annotation.RequestParam")
        }

        if (variant == ServiceVariant.REVISION || variant == ServiceVariant.SEARCHABLE_REVISION) {
            imports.add("org.springframework.data.history.Revision")
            imports.add("org.springframework.data.history.Revisions")
        }

        when (variant) {
            ServiceVariant.READ_ONLY -> {
                if (isLongId) {
                    imports.add("spring.kraft.LongReadOnlyEntityController")
                } else {
                    imports.add("spring.kraft.controller.ReadOnlyEntityController")
                }
            }
            ServiceVariant.BASE -> {
                if (isLongId) {
                    imports.add("spring.kraft.LongBaseEntityController")
                } else {
                    imports.add("spring.kraft.controller.BaseEntityController")
                }
            }
            ServiceVariant.SEARCHABLE -> {
                if (isLongId) {
                    imports.add("spring.kraft.LongSearchableEntityController")
                } else {
                    imports.add("spring.kraft.controller.SearchableEntityController")
                }
            }
            ServiceVariant.REVISION -> {
                if (isLongId) {
                    imports.add("spring.kraft.LongRevisionEntityController")
                } else {
                    imports.add("spring.kraft.controller.RevisionEntityController")
                }
            }
            ServiceVariant.SEARCHABLE_REVISION -> {
                if (isLongId) {
                    imports.add("spring.kraft.LongSearchableRevisionEntityController")
                } else {
                    imports.add("spring.kraft.controller.SearchableRevisionEntityController")
                }
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
                    "LongReadOnlyEntityController<$cls, ${cls}Service, ${cls}Dto>"
                } else {
                    "ReadOnlyEntityController<$idType, $cls, ${cls}Service, ${cls}Dto>"
                }
            }
            ServiceVariant.BASE -> {
                if (isLongId) {
                    "LongBaseEntityController<$cls, ${cls}Service, ${cls}Dto, ${cls}CreateForm, ${cls}UpdateForm>"
                } else {
                    "BaseEntityController<$idType, $cls, ${cls}Service, ${cls}Dto, ${cls}CreateForm, ${cls}UpdateForm>"
                }
            }
            ServiceVariant.SEARCHABLE -> {
                if (isLongId) {
                    "LongSearchableEntityController<$cls, ${cls}Repository, ${cls}Service, ${cls}Dto, ${cls}CreateForm, ${cls}UpdateForm>"
                } else {
                    "SearchableEntityController<$idType, $cls, ${cls}Repository, ${cls}Service, ${cls}Dto, ${cls}CreateForm, ${cls}UpdateForm>"
                }
            }
            ServiceVariant.REVISION -> {
                if (isLongId) {
                    "LongRevisionEntityController<$cls, ${cls}Repository, ${cls}Service, ${cls}Dto, ${cls}CreateForm, ${cls}UpdateForm>"
                } else {
                    "RevisionEntityController<$idType, $cls, ${cls}Repository, ${cls}Service, ${cls}Dto, ${cls}CreateForm, ${cls}UpdateForm>"
                }
            }
            ServiceVariant.SEARCHABLE_REVISION -> {
                if (isLongId) {
                    "LongSearchableRevisionEntityController<$cls, ${cls}Repository, ${cls}Service, ${cls}Dto, ${cls}CreateForm, ${cls}UpdateForm>"
                } else {
                    "SearchableRevisionEntityController<$idType, $cls, ${cls}Repository, ${cls}Service, ${cls}Dto, ${cls}CreateForm, ${cls}UpdateForm>"
                }
            }
        }
    }

    private fun appendListMethod(
        sb: StringBuilder,
        cls: String,
        displayName: String,
    ) {
        sb.appendLine("    @Operation(summary = \"$displayName 목록 조회\")")
        sb.appendLine("    @GetMapping")
        sb.appendLine("    override fun list(pageable: Pageable): Page<${cls}Dto> = super.list(pageable)")
        sb.appendLine()
    }

    private fun appendSearchMethod(
        sb: StringBuilder,
        cls: String,
        displayName: String,
    ) {
        sb.appendLine("    @Operation(summary = \"$displayName 검색\")")
        sb.appendLine("    @GetMapping")
        sb.appendLine("    override fun search(")
        sb.appendLine("        pageable: Pageable,")
        sb.appendLine("        @RequestParam params: Map<String, List<String>>,")
        sb.appendLine("    ): Page<${cls}Dto> = super.search(pageable, params)")
        sb.appendLine()
    }

    private fun appendGetOneMethod(
        sb: StringBuilder,
        cls: String,
        idType: String,
        displayName: String,
    ) {
        sb.appendLine("    @Operation(summary = \"$displayName 단건 조회\")")
        sb.appendLine("    @GetMapping(\"/{id}\")")
        sb.appendLine("    override fun getOne(@PathVariable id: $idType): ${cls}Dto = super.getOne(id)")
        sb.appendLine()
    }

    private fun appendCrudMethods(
        sb: StringBuilder,
        cls: String,
        idType: String,
        displayName: String,
    ) {
        sb.appendLine("    @Operation(summary = \"$displayName 생성\")")
        sb.appendLine("    @PostMapping")
        sb.appendLine("    override fun createOne(")
        sb.appendLine("        @RequestBody request: ${cls}CreateForm,")
        sb.appendLine("        errors: Errors,")
        sb.appendLine("    ): MutationResponse = super.createOne(request, errors)")
        sb.appendLine()

        sb.appendLine("    @Operation(summary = \"$displayName 수정\")")
        sb.appendLine("    @PutMapping")
        sb.appendLine("    override fun updateOne(")
        sb.appendLine("        @RequestBody request: ${cls}UpdateForm,")
        sb.appendLine("        errors: Errors,")
        sb.appendLine("    ): MutationResponse = super.updateOne(request, errors)")
        sb.appendLine()

        sb.appendLine("    @Operation(summary = \"$displayName 삭제\")")
        sb.appendLine("    @DeleteMapping(\"/{id}\")")
        sb.appendLine("    override fun delete(@PathVariable id: $idType): MutationResponse = super.delete(id)")
        sb.appendLine()
    }

    private fun appendToDtoMethod(
        sb: StringBuilder,
        methodName: String,
        metadata: EntityMetadata,
    ) {
        val cls = metadata.className
        sb.appendLine("    override fun $methodName(entity: $cls): ${cls}Dto = ${cls}Dto(")
        sb.appendLine("        id = entity.id!!,")
        metadata.normalColumns.forEach { classified ->
            val propName = NameConverter.toPropertyName(classified.column.name)
            val enumType = metadata.enumOverrides[classified.column.name]
            if (enumType != null) {
                sb.appendLine("        $propName = entity.$propName.name,")
            } else {
                sb.appendLine("        $propName = entity.$propName,")
            }
        }
        sb.appendLine("        createdAt = entity.createdAt?.toYmdHms()?.getOrDefault(\"\") ?: \"\",")
        sb.appendLine("        createdBy = entity.createdBy ?: \"\",")
        sb.appendLine("        updatedAt = entity.updatedAt?.toYmdHms()?.getOrDefault(\"\") ?: \"\",")
        sb.appendLine("        updatedBy = entity.updatedBy ?: \"\",")
        sb.appendLine("    )")
    }

    private fun appendRevisionMethods(
        sb: StringBuilder,
        cls: String,
        idType: String,
        displayName: String,
    ) {
        sb.appendLine("    @Operation(summary = \"$displayName 변경 이력 조회\")")
        sb.appendLine("    @GetMapping(\"/{id}/revisions\")")
        sb.appendLine("    override fun revisions(@PathVariable id: $idType): Revisions<Int, ${cls}Dto> = super.revisions(id)")
        sb.appendLine()

        sb.appendLine("    @Operation(summary = \"$displayName 변경 이력 페이징 조회\")")
        sb.appendLine("    @GetMapping(\"/{id}/revisions/page\")")
        sb.appendLine("    override fun revisionPages(")
        sb.appendLine("        @PathVariable id: $idType,")
        sb.appendLine("        pageable: Pageable,")
        sb.appendLine("    ): Page<Revision<Int, ${cls}Dto>> =")
        sb.appendLine("        super.revisionPages(id, pageable)")
        sb.appendLine()
    }
}
