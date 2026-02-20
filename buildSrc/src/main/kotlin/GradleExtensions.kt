import io.spring.gradle.dependencymanagement.dsl.DependencyManagementExtension
import org.gradle.api.Project
import org.gradle.api.plugins.JavaPluginExtension
import org.gradle.api.provider.Provider
import org.gradle.jvm.toolchain.JavaLanguageVersion
import org.gradle.plugin.use.PluginDependency
import org.jlleitschuh.gradle.ktlint.KtlintExtension
import org.jetbrains.kotlin.gradle.dsl.JvmTarget
import org.jetbrains.kotlin.gradle.dsl.KotlinJvmProjectExtension

val Provider<PluginDependency>.pluginId: String
    get() = get().pluginId

private inline fun <reified T : Any> Project.configureExtension(noinline action: T.() -> Unit) {
    extensions.getByType(T::class.java).apply(action)
}

fun Project.importSpringBom(version: String) {
    configureExtension<DependencyManagementExtension> {
        imports {
            mavenBom("org.springframework.boot:spring-boot-dependencies:$version")
        }
    }
}

fun Project.configureJavaToolchain(version: Int) {
    configureExtension<JavaPluginExtension> {
        toolchain {
            languageVersion.set(JavaLanguageVersion.of(version))
        }
    }
}

fun Project.configureKotlin(jvmTarget: JvmTarget, vararg extraArgs: String) {
    configureExtension<KotlinJvmProjectExtension> {
        compilerOptions {
            this.jvmTarget.set(jvmTarget)
            freeCompilerArgs.addAll(*extraArgs)
        }
    }
}

fun Project.applyKtlint() {
    apply(mapOf("plugin" to "org.jlleitschuh.gradle.ktlint"))
}

