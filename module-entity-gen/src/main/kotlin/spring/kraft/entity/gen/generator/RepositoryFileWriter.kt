package spring.kraft.entity.gen.generator

class RepositoryFileWriter {
    fun write(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val repoPackage = "${metadata.basePackage}.repository"
        val entityPackage = "${metadata.basePackage}.entity"

        sb.appendLine("package $repoPackage")
        sb.appendLine()
        sb.appendLine("import $entityPackage.${metadata.className}")
        sb.appendLine("import org.springframework.data.jpa.repository.JpaRepository")
        sb.appendLine("import org.springframework.data.jpa.repository.JpaSpecificationExecutor")
        sb.appendLine()
        sb.appendLine("interface ${metadata.className}Repository :")
        sb.appendLine("    JpaRepository<${metadata.className}, ${metadata.idType}>,")
        sb.appendLine("    JpaSpecificationExecutor<${metadata.className}>")
        sb.appendLine()

        return sb.toString()
    }
}
