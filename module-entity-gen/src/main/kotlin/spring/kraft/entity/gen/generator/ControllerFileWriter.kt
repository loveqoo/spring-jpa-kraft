package spring.kraft.entity.gen.generator

class ControllerFileWriter {
    fun write(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val controllerPackage = "${metadata.basePackage}.controller"
        val dtoPackage = "${metadata.basePackage}.dto"
        val entityPackage = "${metadata.basePackage}.entity"
        val formPackage = "${metadata.basePackage}.form"
        val repoPackage = "${metadata.basePackage}.repository"
        val servicePackage = "${metadata.basePackage}.service"
        val cls = metadata.className

        sb.appendLine("package $controllerPackage")
        sb.appendLine()
        sb.appendLine("import $dtoPackage.${cls}Dto")
        sb.appendLine("import $entityPackage.$cls")
        sb.appendLine("import $formPackage.${cls}CreateForm")
        sb.appendLine("import $formPackage.${cls}UpdateForm")
        sb.appendLine("import $repoPackage.${cls}Repository")
        sb.appendLine("import $servicePackage.${cls}Service")
        sb.appendLine("import org.springframework.web.bind.annotation.RequestMapping")
        sb.appendLine("import org.springframework.web.bind.annotation.RestController")
        sb.appendLine("import spring.kraft.controller.SearchableEntityController")
        sb.appendLine("import spring.kraft.controller.dto.MutationResponse")
        sb.appendLine()

        sb.appendLine("@RestController")
        sb.appendLine("@RequestMapping(\"/api/${metadata.tableName}\")")
        sb.appendLine("class ${cls}Controller(")
        sb.appendLine("    override val service: ${cls}Service,")
        sb.appendLine(
            ") : SearchableEntityController<${metadata.idType}, $cls, ${cls}Repository, ${cls}Service, ${cls}Dto, ${cls}CreateForm, ${cls}UpdateForm>() {",
        )
        sb.appendLine("    override val tableName: String = \"${metadata.tableName}\"")
        sb.appendLine()

        sb.appendLine("    override fun toReadDto(entity: $cls): ${cls}Dto = ${cls}Dto(")
        sb.appendLine("        id = entity.id!!,")
        metadata.normalColumns.forEach { classified ->
            val propName = NameConverter.toPropertyName(classified.column.name)
            sb.appendLine("        $propName = entity.$propName,")
        }
        sb.appendLine("    )")
        sb.appendLine()

        sb.appendLine("    override fun toCreateDto(entity: $cls): MutationResponse =")
        sb.appendLine("        MutationResponse.create(entity.id!!, tableName)")
        sb.appendLine()
        sb.appendLine("    override fun toUpdateDto(entity: $cls): MutationResponse =")
        sb.appendLine("        MutationResponse.update(entity.id!!, tableName)")
        sb.appendLine()
        sb.appendLine("    override fun toDeleteDto(id: ${metadata.idType}): MutationResponse =")
        sb.appendLine("        MutationResponse.delete(id, tableName)")

        sb.appendLine("}")
        sb.appendLine()

        return sb.toString()
    }
}
