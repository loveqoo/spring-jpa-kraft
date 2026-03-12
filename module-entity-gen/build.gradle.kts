plugins {
    antlr
    `java-gradle-plugin`
}

gradlePlugin {
    plugins {
        create("kraftEntityGen") {
            id = "spring.kraft.entity-gen"
            implementationClass = "spring.kraft.entity.gen.gradle.KraftEntityGenPlugin"
        }
    }
}

dependencies {
    antlr(libs.antlr4)
    implementation(libs.antlr4.runtime)
    implementation(libs.jackson.module.kotlin)
    testImplementation(project(":module-mvc"))
    testImplementation(libs.swagger.annotations)
    testImplementation(libs.spring.boot.starter.data.jpa)
    testImplementation(libs.spring.boot.starter.webmvc)
    testImplementation(libs.kotlin.compile.testing.ksp)
}

tasks.generateGrammarSource {
    arguments = arguments + listOf("-visitor", "-package", "spring.kraft.entity.gen.parser")
    outputDirectory = file("${layout.buildDirectory.get()}/generated-src/antlr/main/spring/kraft/entity/gen/parser")
}

tasks.named("compileKotlin") { dependsOn("generateGrammarSource") }
tasks.named("compileJava") { dependsOn("generateGrammarSource") }

tasks.named<Jar>("sourcesJar") {
    duplicatesStrategy = DuplicatesStrategy.EXCLUDE
}

sourceSets {
    main {
        java {
            srcDir("${layout.buildDirectory.get()}/generated-src/antlr/main")
        }
    }
}
