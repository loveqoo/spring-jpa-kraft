package spring.kraft.entity.gen.gradle

import org.gradle.api.DefaultTask
import org.gradle.api.GradleException
import org.gradle.api.file.RegularFileProperty
import org.gradle.api.provider.ListProperty
import org.gradle.api.provider.Property
import org.gradle.api.tasks.Input
import org.gradle.api.tasks.InputFile
import org.gradle.api.tasks.Optional
import org.gradle.api.tasks.OutputDirectory
import org.gradle.api.tasks.TaskAction
import spring.kraft.entity.gen.DdlParser
import spring.kraft.entity.gen.config.AggregateConfigParser
import spring.kraft.entity.gen.generator.SkeletonGenerator
import java.io.File

abstract class GenerateEntitiesTask : DefaultTask() {
    @get:InputFile
    @get:Optional
    abstract val ddlFile: RegularFileProperty

    @get:InputFile
    abstract val configFile: RegularFileProperty

    @get:Input
    abstract val outputDir: Property<String>

    @get:Input
    @get:Optional
    abstract val targetTables: ListProperty<String>

    @get:OutputDirectory
    val resolvedOutputDir: File
        get() = project.file(outputDir.get())

    @TaskAction
    fun generate() {
        val configJson = configFile.get().asFile.readText()
        val outDir = resolvedOutputDir
        val generator = SkeletonGenerator()
        val tables = targetTables.orNull?.takeIf { it.isNotEmpty() }?.toSet()

        if (ddlFile.isPresent) {
            val schema = DdlParser().parse(ddlFile.get().asFile)
            val config = AggregateConfigParser().parse(configJson)
            generator.generate(schema, config, outDir, tables)
        } else {
            try {
                generator.generate(configJson, outDir, tables)
            } catch (e: IllegalArgumentException) {
                throw GradleException(e.message ?: "Failed to generate entities", e)
            }
        }

        val scope = if (tables != null) "tables [${tables.joinToString()}]" else "all entities"
        logger.lifecycle("Generated $scope to: ${outDir.absolutePath}")
    }
}
