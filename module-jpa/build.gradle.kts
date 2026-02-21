plugins {
    `java-library`
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.kotlin.jpa)
    kotlin("kapt")
}

dependencies {
    implementation(project(":module-core"))
    api(libs.spring.boot.starter.data.jpa)
    implementation(variantOf(libs.querydsl.jpa) { classifier("jakarta") })
    kapt(variantOf(libs.querydsl.apt) { classifier("jakarta") })
    runtimeOnly(libs.h2)
    testImplementation(libs.spring.boot.starter.data.jpa.test)
}

tasks.matching { it.name == "kaptTestKotlin" || it.name == "kaptGenerateStubsTestKotlin" }.configureEach {
    enabled = false
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}
