package spring.kraft.jpa.search

import jakarta.persistence.criteria.Path
import org.springframework.data.jpa.domain.Specification
import java.math.BigDecimal
import java.time.LocalDate
import java.time.LocalDateTime
import java.time.LocalTime

object SearchSpecBuilder {
    private val EXCLUDED_PARAMS = setOf("page", "size", "sort")

    fun <E : Any> build(
        params: Map<String, List<String>>,
        provider: SearchFieldProvider<E>,
    ): Specification<E>? {
        val binder = SearchBinder<E>()
        provider.customize(binder)

        val specs =
            params
                .filter { (key, values) ->
                    key !in EXCLUDED_PARAMS &&
                        key !in binder.excluded &&
                        values.isNotEmpty() &&
                        (binder.allowUnbound || key in binder.bindings)
                }.mapNotNull { (key, values) ->
                    val op = binder.bindings[key] ?: SearchOp.EQ
                    buildSpec<E>(key, op, values)
                }

        if (specs.isEmpty()) return null
        return specs.reduce { acc, spec -> acc.and(spec) }
    }

    private fun <E : Any> buildSpec(
        fieldName: String,
        op: SearchOp,
        values: List<String>,
    ): Specification<E>? =
        when (op) {
            SearchOp.EQ -> eqSpec(fieldName, values)
            SearchOp.LIKE -> likeSpec(fieldName, values.first())
            SearchOp.GTE -> gteSpec(fieldName, values.first())
            SearchOp.LTE -> lteSpec(fieldName, values.first())
            SearchOp.BETWEEN -> betweenSpec(fieldName, values)
            SearchOp.IS_NULL -> isNullSpec(fieldName, values.first())
        }

    private fun <E : Any> eqSpec(
        fieldName: String,
        values: List<String>,
    ): Specification<E> =
        Specification { root, _, cb ->
            val path = root.get<Any>(fieldName)
            if (values.size == 1) {
                cb.equal(path, convertValue(path, values.first()))
            } else {
                path.`in`(values.map { convertValue(path, it) })
            }
        }

    private fun <E : Any> likeSpec(
        fieldName: String,
        value: String,
    ): Specification<E> =
        Specification { root, _, cb ->
            cb.like(root.get(fieldName), "%$value%")
        }

    private fun <E : Any> gteSpec(
        fieldName: String,
        value: String,
    ): Specification<E> =
        Specification { root, _, cb ->
            val path = root.get<Comparable<Any>>(fieldName)
            @Suppress("UNCHECKED_CAST")
            cb.greaterThanOrEqualTo(path, convertValue(path, value) as Comparable<Any>)
        }

    private fun <E : Any> lteSpec(
        fieldName: String,
        value: String,
    ): Specification<E> =
        Specification { root, _, cb ->
            val path = root.get<Comparable<Any>>(fieldName)
            @Suppress("UNCHECKED_CAST")
            cb.lessThanOrEqualTo(path, convertValue(path, value) as Comparable<Any>)
        }

    private fun <E : Any> betweenSpec(
        fieldName: String,
        values: List<String>,
    ): Specification<E>? {
        if (values.size < 2) return null
        return Specification { root, _, cb ->
            val path = root.get<Comparable<Any>>(fieldName)
            @Suppress("UNCHECKED_CAST")
            cb.between(
                path,
                convertValue(path, values[0]) as Comparable<Any>,
                convertValue(path, values[1]) as Comparable<Any>,
            )
        }
    }

    private fun <E : Any> isNullSpec(
        fieldName: String,
        value: String,
    ): Specification<E> =
        Specification { root, _, cb ->
            if (value.toBoolean()) {
                cb.isNull(root.get<Any>(fieldName))
            } else {
                cb.isNotNull(root.get<Any>(fieldName))
            }
        }

    private fun convertValue(
        path: Path<*>,
        value: String,
    ): Any =
        when (path.javaType) {
            String::class.java -> value
            Long::class.java, java.lang.Long::class.java -> value.toLong()
            Int::class.java, java.lang.Integer::class.java -> value.toInt()
            Short::class.java, java.lang.Short::class.java -> value.toShort()
            Double::class.java, java.lang.Double::class.java -> value.toDouble()
            Float::class.java, java.lang.Float::class.java -> value.toFloat()
            Boolean::class.java, java.lang.Boolean::class.java -> value.toBoolean()
            BigDecimal::class.java -> BigDecimal(value)
            LocalDateTime::class.java -> LocalDateTime.parse(value)
            LocalDate::class.java -> LocalDate.parse(value)
            LocalTime::class.java -> LocalTime.parse(value)
            else -> value
        }
}
