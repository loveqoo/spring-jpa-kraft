package spring.kraft.entity.gen.generator

class RepositoryFileWriter {
    fun write(metadata: EntityMetadata): String {
        val sb = StringBuilder()

        sb.appendLine("package ${metadata.basePackage}")
        sb.appendLine()
        sb.appendLine("import org.springframework.data.jpa.repository.JpaRepository")
        sb.appendLine("import org.springframework.data.jpa.repository.JpaSpecificationExecutor")
        if (metadata.entityMode.revision) {
            sb.appendLine("import org.springframework.data.repository.history.RevisionRepository")
        }
        sb.appendLine()
        sb.appendLine("interface ${metadata.className}Repository :")
        sb.appendLine("    JpaRepository<${metadata.className}, ${metadata.idType}>,")
        if (metadata.entityMode.revision) {
            sb.appendLine("    RevisionRepository<${metadata.className}, ${metadata.idType}, Int>,")
        }
        sb.appendLine("    JpaSpecificationExecutor<${metadata.className}>")
        sb.appendLine()

        return sb.toString()
    }
}
