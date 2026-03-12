package spring.kraft.entity.gen.gradle

import org.gradle.api.file.RegularFileProperty
import org.gradle.api.model.ObjectFactory
import org.gradle.api.provider.Property

abstract class KraftEntityGenExtension(
    objects: ObjectFactory,
) {
    val ddlFile: RegularFileProperty = objects.fileProperty()
    val configFile: RegularFileProperty = objects.fileProperty()
    val outputDir: Property<String> =
        objects
            .property(String::class.java)
            .convention("src/main/kotlin")
}
