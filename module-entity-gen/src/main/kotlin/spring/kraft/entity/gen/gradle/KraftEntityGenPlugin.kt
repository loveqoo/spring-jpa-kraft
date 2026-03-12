package spring.kraft.entity.gen.gradle

import org.gradle.api.Plugin
import org.gradle.api.Project

class KraftEntityGenPlugin : Plugin<Project> {
    override fun apply(project: Project) {
        val extension =
            project.extensions.create(
                "kraftEntityGen",
                KraftEntityGenExtension::class.java,
            )

        project.tasks.register("generateEntities", GenerateEntitiesTask::class.java) { task ->
            task.group = "code generation"
            task.description = "Generate JPA entity classes and related code from DDL and aggregate config."
            task.ddlFile.set(extension.ddlFile)
            task.configFile.set(extension.configFile)
            task.outputDir.set(extension.outputDir)
        }
    }
}
