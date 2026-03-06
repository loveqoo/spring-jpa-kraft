package spring.kraft.entity.gen.generator

import spring.kraft.entity.gen.TableSchema
import spring.kraft.entity.gen.config.AggregateConfig
import java.io.File

class SkeletonGenerator {
    private val entityGenerator = EntityGenerator()
    private val entityFileWriter = EntityFileWriter()
    private val repositoryFileWriter = RepositoryFileWriter()
    private val formFileWriter = FormFileWriter()
    private val dtoFileWriter = DtoFileWriter()
    private val formResolverFileWriter = FormResolverFileWriter()
    private val serviceFileWriter = ServiceFileWriter()
    private val searchFieldProviderFileWriter = SearchFieldProviderFileWriter()
    private val controllerFileWriter = ControllerFileWriter()

    fun generate(
        schema: TableSchema,
        config: AggregateConfig,
        outputDir: File,
    ) {
        val metadataList = entityGenerator.buildMetadataList(schema, config)

        metadataList.forEach { metadata ->
            writeFile(outputDir, "${metadata.basePackage}.entity", "${metadata.className}.kt") {
                entityFileWriter.write(metadata)
            }
            writeFile(outputDir, "${metadata.basePackage}.repository", "${metadata.className}Repository.kt") {
                repositoryFileWriter.write(metadata)
            }
            writeFile(outputDir, "${metadata.basePackage}.form", "${metadata.className}CreateForm.kt") {
                formFileWriter.writeCreateForm(metadata)
            }
            writeFile(outputDir, "${metadata.basePackage}.form", "${metadata.className}UpdateForm.kt") {
                formFileWriter.writeUpdateForm(metadata)
            }
            writeFile(outputDir, "${metadata.basePackage}.dto", "${metadata.className}Dto.kt") {
                dtoFileWriter.write(metadata)
            }
            writeFile(outputDir, "${metadata.basePackage}.service", "${metadata.className}FormResolver.kt") {
                formResolverFileWriter.write(metadata)
            }
            writeFile(outputDir, "${metadata.basePackage}.service", "${metadata.className}SearchFields.kt") {
                searchFieldProviderFileWriter.write(metadata)
            }
            writeFile(outputDir, "${metadata.basePackage}.service", "${metadata.className}Service.kt") {
                serviceFileWriter.write(metadata)
            }
            writeFile(outputDir, "${metadata.basePackage}.controller", "${metadata.className}Controller.kt") {
                controllerFileWriter.write(metadata)
            }
        }
    }

    private fun writeFile(
        outputDir: File,
        packageName: String,
        fileName: String,
        contentProvider: () -> String,
    ) {
        val packageDir = File(outputDir, packageName.replace('.', '/'))
        packageDir.mkdirs()
        File(packageDir, fileName).writeText(contentProvider())
    }
}
