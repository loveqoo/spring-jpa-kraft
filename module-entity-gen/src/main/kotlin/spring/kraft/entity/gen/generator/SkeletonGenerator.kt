package spring.kraft.entity.gen.generator

import spring.kraft.entity.gen.TableSchema
import spring.kraft.entity.gen.config.AggregateConfig
import spring.kraft.entity.gen.config.AggregateConfigParser
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
    private val enumFileWriter = EnumFileWriter()

    fun generate(
        configJson: String,
        outputDir: File,
        targetTables: Set<String>? = null,
    ) {
        val (config, schema) = AggregateConfigParser().parseWithSchema(configJson)
        generate(schema, config, outputDir, targetTables)
    }

    fun generate(
        schema: TableSchema,
        config: AggregateConfig,
        outputDir: File,
        targetTables: Set<String>? = null,
    ) {
        val metadataList = entityGenerator.buildMetadataList(schema, config)
        val filtered =
            if (targetTables != null) {
                metadataList.filter { it.tableName in targetTables }
            } else {
                metadataList
            }

        filtered.forEach { metadata ->
            val pkg = metadata.basePackage
            val mode = metadata.entityMode
            val variant = ServiceFileWriter.resolveVariant(mode)

            writeFile(outputDir, pkg, "${metadata.className}.kt") {
                entityFileWriter.write(metadata)
            }
            writeFile(outputDir, pkg, "${metadata.className}Repository.kt") {
                repositoryFileWriter.write(metadata)
            }
            writeFile(outputDir, pkg, "${metadata.className}Dto.kt") {
                dtoFileWriter.write(metadata)
            }

            if (!mode.readOnly) {
                writeFile(outputDir, pkg, "${metadata.className}CreateForm.kt") {
                    formFileWriter.writeCreateForm(metadata)
                }
                writeFile(outputDir, pkg, "${metadata.className}UpdateForm.kt") {
                    formFileWriter.writeUpdateForm(metadata)
                }
                writeFile(outputDir, pkg, "${metadata.className}FormResolver.kt") {
                    formResolverFileWriter.write(metadata)
                }
            }

            if (variant == ServiceVariant.SEARCHABLE || variant == ServiceVariant.SEARCHABLE_REVISION) {
                writeFile(outputDir, pkg, "${metadata.className}SearchFields.kt") {
                    searchFieldProviderFileWriter.write(metadata)
                }
            }

            writeFile(outputDir, pkg, "${metadata.className}Service.kt") {
                serviceFileWriter.write(metadata)
            }
            writeFile(outputDir, pkg, "${metadata.className}Controller.kt") {
                controllerFileWriter.write(metadata)
            }
        }

        // Generate enum classes in basePackage (only when generating all or when no filter)
        if (targetTables == null) {
            config.enums.forEach { (enumName, values) ->
                writeFile(outputDir, config.basePackage, "$enumName.kt") {
                    enumFileWriter.write(config.basePackage, enumName, values)
                }
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
