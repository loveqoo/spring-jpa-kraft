package spring.kraft.ksp.annotation

import kotlin.reflect.KClass

@Target(AnnotationTarget.CLASS)
@Retention(AnnotationRetention.SOURCE)
annotation class KraftAggregate(
    val root: KClass<*>,
    val exclude: Array<CommonMethod> = [],
    val mediatorPackage: String = "",
)
