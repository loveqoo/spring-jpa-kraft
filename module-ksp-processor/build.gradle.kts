dependencies {
    implementation(project(":module-ksp-annotations"))
    implementation(libs.ksp.api)
    testImplementation(libs.kotlin.compile.testing.ksp)
}
