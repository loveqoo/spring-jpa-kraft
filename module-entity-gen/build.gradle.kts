plugins {
    antlr
}

dependencies {
    antlr(libs.antlr4)
    implementation(libs.antlr4.runtime)
    implementation(libs.jackson.module.kotlin)
}

tasks.generateGrammarSource {
    arguments = arguments + listOf("-visitor", "-package", "spring.kraft.entity.gen.parser")
    outputDirectory = file("${layout.buildDirectory.get()}/generated-src/antlr/main/spring/kraft/entity/gen/parser")
}

tasks.named("compileKotlin") { dependsOn("generateGrammarSource") }
tasks.named("compileJava") { dependsOn("generateGrammarSource") }

sourceSets {
    main {
        java {
            srcDir("${layout.buildDirectory.get()}/generated-src/antlr/main")
        }
    }
}
