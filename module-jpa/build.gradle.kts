plugins {
    `java-library`
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.kotlin.jpa)
    alias(libs.plugins.ksp)
}

dependencies {
    implementation(project(":module-core"))
    api(libs.spring.boot.starter.data.jpa)
    api(libs.spring.data.envers)
    api(libs.openfeign.querydsl.jpa)
    ksp(libs.openfeign.querydsl.ksp)
    runtimeOnly(libs.h2)
    testImplementation(libs.spring.boot.starter.data.jpa.test)
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}
