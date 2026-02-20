plugins {
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.spring.boot)
}

dependencies {
    implementation(project(":module-core"))
    implementation(project(":module-jpa"))
    implementation(libs.spring.boot.starter.webmvc)
    implementation(libs.spring.boot.h2console)
    implementation(libs.jackson.module.kotlin)
    runtimeOnly(libs.h2)
    testImplementation(libs.spring.boot.starter.webmvc.test)
    testImplementation(libs.spring.boot.starter.data.jpa.test)
}
