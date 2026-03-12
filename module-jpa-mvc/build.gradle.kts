plugins {
    `java-library`
    alias(libs.plugins.kotlin.spring)
    alias(libs.plugins.kotlin.jpa)
}

allOpen {
    annotation("jakarta.persistence.Entity")
    annotation("jakarta.persistence.MappedSuperclass")
    annotation("jakarta.persistence.Embeddable")
}

dependencies {
    // core
    api(libs.arrow.core)

    // jpa
    api(libs.spring.boot.starter.data.jpa)
    api(libs.spring.data.envers)

    // mvc
    api(libs.spring.boot.starter.validation)
    api(libs.spring.boot.starter.webmvc)
    implementation(libs.spring.boot.h2console)
    implementation(libs.jackson.module.kotlin)
    api(libs.swagger.annotations)

    // test
    runtimeOnly(libs.h2)
    testImplementation(libs.spring.boot.starter.data.jpa.test)
    testImplementation(libs.spring.boot.starter.webmvc.test)
    testImplementation(libs.mockito.kotlin)
}
