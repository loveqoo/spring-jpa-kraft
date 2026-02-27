package spring.kraft.ksp.annotation

@Target(AnnotationTarget.FUNCTION)
@Retention(AnnotationRetention.SOURCE)
annotation class KraftExpose(
    val name: String = "",
)
