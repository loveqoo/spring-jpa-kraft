package spring.kraft.entity.gen.generator

class ServiceFileWriter {
    fun write(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val servicePackage = "${metadata.basePackage}.service"
        val entityPackage = "${metadata.basePackage}.entity"
        val formPackage = "${metadata.basePackage}.form"
        val repoPackage = "${metadata.basePackage}.repository"
        val cls = metadata.className

        sb.appendLine("package $servicePackage")
        sb.appendLine()
        sb.appendLine("import $entityPackage.$cls")
        sb.appendLine("import $formPackage.${cls}CreateForm")
        sb.appendLine("import $formPackage.${cls}UpdateForm")
        sb.appendLine("import $repoPackage.${cls}Repository")
        sb.appendLine("import org.springframework.stereotype.Service")
        sb.appendLine("import spring.kraft.form.FormResolver")
        sb.appendLine("import spring.kraft.jpa.search.SearchFieldProvider")
        sb.appendLine("import spring.kraft.service.SearchableEntityService")
        sb.appendLine()

        sb.appendLine("@Service")
        sb.appendLine("class ${cls}Service(")
        sb.appendLine("    override val repo: ${cls}Repository,")
        sb.appendLine("    override val formResolver: FormResolver<${metadata.idType}, $cls, ${cls}CreateForm, ${cls}UpdateForm>,")
        sb.appendLine("    override val searchFieldProvider: SearchFieldProvider<$cls>,")
        sb.appendLine(") : SearchableEntityService<${metadata.idType}, $cls, ${cls}Repository, ${cls}CreateForm, ${cls}UpdateForm> {")
        sb.appendLine("    override val tableName: String = \"${metadata.tableName}\"")
        sb.appendLine("}")
        sb.appendLine()

        return sb.toString()
    }
}
