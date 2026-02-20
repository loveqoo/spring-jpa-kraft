plugins {
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.kotlin.jpa)
}

dependencies {
    implementation(project(":module-core"))
    implementation(libs.spring.boot.starter.data.jpa)
    runtimeOnly(libs.h2)
    testImplementation(libs.spring.boot.starter.data.jpa.test)
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}
