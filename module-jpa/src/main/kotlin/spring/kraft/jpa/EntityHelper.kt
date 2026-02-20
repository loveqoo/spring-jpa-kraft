package spring.kraft.jpa

import spring.kraft.jpa.type.Identifiable
import java.util.Objects
import kotlin.reflect.full.findAnnotation
import kotlin.reflect.full.memberProperties

object EntityHelper {
    private fun <T : Any> extractGetter(t1: T) =
        t1::class
            .memberProperties
            .filter { it.getter.findAnnotation<IdentityColumn>() != null }
            .map { it.getter }

    fun compareTo(
        e1: Identifiable,
        e2: Identifiable,
    ): Result<Int> =
        runCatching {
            check(!e1.isNew && !e2.isNew) { "Fail: Compare entities" }
            checkNotNull(e1.id).compareTo(checkNotNull(e2.id))
        }

    fun <T : Any> transientEquals(
        o1: T,
        o2: T,
        vararg otherGettersConfig: (T) -> Any?,
    ): Boolean {
        val thisGetters = extractGetter(o1).map { it.call(o1) == it.call(o2) }
        val otherGetters = otherGettersConfig.map { it.invoke(o1) == it.invoke(o2) }
        return (thisGetters + otherGetters).reduce { acc, b -> acc && b }
    }

    fun <T : Any> transientHashCode(
        e1: T,
        vararg otherGettersConfig: (T) -> Any?,
    ): Int {
        val thisGetters = extractGetter(e1).map { it.call(e1) }
        val otherGetters = otherGettersConfig.map { it.invoke(e1) }
        return Objects.hash(*(thisGetters + otherGetters).toTypedArray())
    }
}
