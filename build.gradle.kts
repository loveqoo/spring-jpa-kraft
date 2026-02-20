import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
	alias(libs.plugins.kotlin.spring) apply false
	alias(libs.plugins.kotlin.jpa) apply false
	alias(libs.plugins.spring.boot) apply false
}

description = "Opinionated Spring MVC & JPA abstractions in Kotlin"

val springBootVersion: String = libs.versions.spring.boot.get()

subprojects {
	val libs = rootProject.libs
	apply(plugin = libs.plugins.kotlin.jvm.pluginId)
	apply(plugin = libs.plugins.spring.dependency.management.pluginId)

	group = "spring.jpa.kraft"
	version = "0.0.1-SNAPSHOT"

	repositories {
		mavenCentral()
	}

	importSpringBom(springBootVersion)
	configureJavaToolchain(24)
	configureKotlin(JvmTarget.JVM_24, "-Xjsr305=strict", "-Xannotation-default-target=param-property")
	applyKtlint()

	dependencies {
		"implementation"(libs.kotlin.reflect)
		"testImplementation"(libs.kotlin.test.junit5)
		"testRuntimeOnly"(libs.junit.platform.launcher)
	}

	tasks.withType<Test> {
		useJUnitPlatform()
	}
}
