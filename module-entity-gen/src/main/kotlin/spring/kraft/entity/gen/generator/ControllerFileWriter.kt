package spring.kraft.entity.gen.generator

class ControllerFileWriter {
    fun write(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val cls = metadata.className
        val isLongId = metadata.idType == "Long"
        val displayName = NameConverter.toDisplayName(metadata.tableName)

        sb.appendLine("package ${metadata.basePackage}")
        sb.appendLine()

        // imports
        sb.appendLine("import io.swagger.v3.oas.annotations.Operation")
        sb.appendLine("import io.swagger.v3.oas.annotations.tags.Tag")
        sb.appendLine("import org.springframework.data.domain.Page")
        sb.appendLine("import org.springframework.data.domain.Pageable")
        sb.appendLine("import org.springframework.validation.Errors")
        sb.appendLine("import org.springframework.web.bind.annotation.DeleteMapping")
        sb.appendLine("import org.springframework.web.bind.annotation.GetMapping")
        sb.appendLine("import org.springframework.web.bind.annotation.PathVariable")
        sb.appendLine("import org.springframework.web.bind.annotation.PostMapping")
        sb.appendLine("import org.springframework.web.bind.annotation.PutMapping")
        sb.appendLine("import org.springframework.web.bind.annotation.RequestBody")
        sb.appendLine("import org.springframework.web.bind.annotation.RequestMapping")
        sb.appendLine("import org.springframework.web.bind.annotation.RequestParam")
        sb.appendLine("import org.springframework.web.bind.annotation.RestController")
        sb.appendLine("import spring.kraft.controller.dto.MutationResponse")
        sb.appendLine("import spring.kraft.core.toYmdHms")
        if (isLongId) {
            sb.appendLine("import spring.kraft.LongSearchableEntityController")
        } else {
            sb.appendLine("import spring.kraft.controller.SearchableEntityController")
        }
        sb.appendLine()

        // class declaration
        sb.appendLine("@Tag(name = \"$displayName\")")
        sb.appendLine("@RestController")
        sb.appendLine("@RequestMapping(\"/api/${metadata.tableName}\")")
        sb.appendLine("class ${cls}Controller(")
        sb.appendLine("    override val service: ${cls}Service,")
        if (isLongId) {
            sb.appendLine(
                ") : LongSearchableEntityController<$cls, ${cls}Repository, ${cls}Service, ${cls}Dto, ${cls}CreateForm, ${cls}UpdateForm>() {",
            )
        } else {
            sb.appendLine(
                ") : SearchableEntityController<${metadata.idType}, $cls, ${cls}Repository, ${cls}Service, ${cls}Dto, ${cls}CreateForm, ${cls}UpdateForm>() {",
            )
        }
        sb.appendLine("    override val tableName: String = \"${metadata.tableName}\"")
        sb.appendLine()

        // API methods
        sb.appendLine("    @Operation(summary = \"$displayName 검색\")")
        sb.appendLine("    @GetMapping")
        sb.appendLine("    override fun search(")
        sb.appendLine("        pageable: Pageable,")
        sb.appendLine("        @RequestParam params: Map<String, List<String>>,")
        sb.appendLine("    ): Page<${cls}Dto> = super.search(pageable, params)")
        sb.appendLine()

        sb.appendLine("    @Operation(summary = \"$displayName 단건 조회\")")
        sb.appendLine("    @GetMapping(\"/{id}\")")
        sb.appendLine("    override fun getOne(@PathVariable id: ${metadata.idType}): ${cls}Dto = super.getOne(id)")
        sb.appendLine()

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
        sb.appendLine("    override fun delete(@PathVariable id: ${metadata.idType}): MutationResponse = super.delete(id)")
        sb.appendLine()

        // toReadDto
        sb.appendLine("    override fun toReadDto(entity: $cls): ${cls}Dto = ${cls}Dto(")
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

        sb.appendLine("}")
        sb.appendLine()

        return sb.toString()
    }
}
