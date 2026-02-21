package spring.kraft.core

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ResultExtensionsTest {
    private val error = IllegalStateException("fail")

    @Test
    fun `flatMap 성공 시 변환 결과 반환`() {
        val result = Result.success(1).flatMap { Result.success(it.toString()) }

        assertEquals("1", result.getOrThrow())
    }

    @Test
    fun `flatMap 실패 시 원본 실패 전파`() {
        val result = Result.failure<Int>(error).flatMap { Result.success(it.toString()) }

        assertTrue(result.isFailure)
        assertEquals(error, result.exceptionOrNull())
    }

    @Test
    fun `flatMap 변환 중 실패 시 변환 실패 전파`() {
        val transformError = RuntimeException("transform fail")
        val result = Result.success(1).flatMap { Result.failure<String>(transformError) }

        assertTrue(result.isFailure)
        assertEquals(transformError, result.exceptionOrNull())
    }

    @Test
    fun `zip2 모두 성공 시 변환 결과 반환`() {
        val result =
            Result.success(1).zip(Result.success("a")) { i, s ->
                "$i$s"
            }

        assertEquals("1a", result.getOrThrow())
    }

    @Test
    fun `zip2 첫 번째 실패 시 실패 전파`() {
        val result =
            Result.failure<Int>(error).zip(Result.success("a")) { i, s ->
                "$i$s"
            }

        assertTrue(result.isFailure)
        assertEquals(error, result.exceptionOrNull())
    }

    @Test
    fun `zip2 두 번째 실패 시 실패 전파`() {
        val result =
            Result.success(1).zip(Result.failure<String>(error)) { i, s ->
                "$i$s"
            }

        assertTrue(result.isFailure)
        assertEquals(error, result.exceptionOrNull())
    }

    @Test
    fun `zip3 모두 성공 시 변환 결과 반환`() {
        val result =
            Result.success(1).zip(Result.success("a"), Result.success(true)) { i, s, b ->
                "$i$s$b"
            }

        assertEquals("1atrue", result.getOrThrow())
    }

    @Test
    fun `zip3 중간 실패 시 실패 전파`() {
        val result =
            Result.success(1).zip(Result.failure<String>(error), Result.success(true)) { i, s, b ->
                "$i$s$b"
            }

        assertTrue(result.isFailure)
        assertEquals(error, result.exceptionOrNull())
    }

    @Test
    fun `zip4 모두 성공 시 변환 결과 반환`() {
        val result =
            Result.success(1).zip(
                Result.success("a"),
                Result.success(true),
                Result.success(2.0),
            ) { i, s, b, d ->
                "$i$s$b$d"
            }

        assertEquals("1atrue2.0", result.getOrThrow())
    }

    @Test
    fun `zip4 마지막 실패 시 실패 전파`() {
        val result =
            Result.success(1).zip(
                Result.success("a"),
                Result.success(true),
                Result.failure<Double>(error),
            ) { i, s, b, d ->
                "$i$s$b$d"
            }

        assertTrue(result.isFailure)
        assertEquals(error, result.exceptionOrNull())
    }

    @Test
    fun `zip5 모두 성공 시 변환 결과 반환`() {
        val result =
            Result.success(1).zip(
                Result.success("a"),
                Result.success(true),
                Result.success(2.0),
                Result.success('z'),
            ) { i, s, b, d, c ->
                "$i$s$b$d$c"
            }

        assertEquals("1atrue2.0z", result.getOrThrow())
    }

    @Test
    fun `zip5 세 번째 실패 시 실패 전파`() {
        val result =
            Result.success(1).zip(
                Result.success("a"),
                Result.failure<Boolean>(error),
                Result.success(2.0),
                Result.success('z'),
            ) { i, s, b, d, c ->
                "$i$s$b$d$c"
            }

        assertTrue(result.isFailure)
        assertEquals(error, result.exceptionOrNull())
    }

    @Test
    fun `zipLazy2 모두 성공 시 변환 결과 반환`() {
        val result =
            Result.success(1).zipLazy({ Result.success("a") }) { i, s ->
                "$i$s"
            }

        assertEquals("1a", result.getOrThrow())
    }

    @Test
    fun `zipLazy2 첫 번째 실패 시 두 번째 람다 미실행`() {
        var secondEvaluated = false
        val result =
            Result.failure<Int>(error).zipLazy({
                secondEvaluated = true
                Result.success("a")
            }) { i, s ->
                "$i$s"
            }

        assertTrue(result.isFailure)
        assertFalse(secondEvaluated)
    }

    @Test
    fun `zipLazy3 모두 성공 시 변환 결과 반환`() {
        val result =
            Result.success(1).zipLazy(
                { Result.success("a") },
                { Result.success(true) },
            ) { i, s, b ->
                "$i$s$b"
            }

        assertEquals("1atrue", result.getOrThrow())
    }

    @Test
    fun `zipLazy3 첫 번째 실패 시 나머지 람다 미실행`() {
        var secondEvaluated = false
        var thirdEvaluated = false
        val result =
            Result.failure<Int>(error).zipLazy(
                {
                    secondEvaluated = true
                    Result.success("a")
                },
                {
                    thirdEvaluated = true
                    Result.success(true)
                },
            ) { i, s, b ->
                "$i$s$b"
            }

        assertTrue(result.isFailure)
        assertFalse(secondEvaluated)
        assertFalse(thirdEvaluated)
    }

    @Test
    fun `zipLazy3 두 번째 실패 시 세 번째 람다 미실행`() {
        var thirdEvaluated = false
        val result =
            Result.success(1).zipLazy(
                { Result.failure<String>(error) },
                {
                    thirdEvaluated = true
                    Result.success(true)
                },
            ) { i, s, b ->
                "$i$s$b"
            }

        assertTrue(result.isFailure)
        assertFalse(thirdEvaluated)
    }

    @Test
    fun `zipLazy4 모두 성공 시 변환 결과 반환`() {
        val result =
            Result.success(1).zipLazy(
                { Result.success("a") },
                { Result.success(true) },
                { Result.success(2.0) },
            ) { i, s, b, d ->
                "$i$s$b$d"
            }

        assertEquals("1atrue2.0", result.getOrThrow())
    }

    @Test
    fun `zipLazy4 두 번째 실패 시 나머지 람다 미실행`() {
        var thirdEvaluated = false
        var fourthEvaluated = false
        val result =
            Result.success(1).zipLazy(
                { Result.failure<String>(error) },
                {
                    thirdEvaluated = true
                    Result.success(true)
                },
                {
                    fourthEvaluated = true
                    Result.success(2.0)
                },
            ) { i, s, b, d ->
                "$i$s$b$d"
            }

        assertTrue(result.isFailure)
        assertFalse(thirdEvaluated)
        assertFalse(fourthEvaluated)
    }

    @Test
    fun `zipLazy5 모두 성공 시 변환 결과 반환`() {
        val result =
            Result.success(1).zipLazy(
                { Result.success("a") },
                { Result.success(true) },
                { Result.success(2.0) },
                { Result.success('z') },
            ) { i, s, b, d, c ->
                "$i$s$b$d$c"
            }

        assertEquals("1atrue2.0z", result.getOrThrow())
    }

    @Test
    fun `zipLazy5 두 번째 실패 시 나머지 람다 미실행`() {
        var thirdEvaluated = false
        var fourthEvaluated = false
        var fifthEvaluated = false
        val result =
            Result.success(1).zipLazy(
                { Result.failure<String>(error) },
                {
                    thirdEvaluated = true
                    Result.success(true)
                },
                {
                    fourthEvaluated = true
                    Result.success(2.0)
                },
                {
                    fifthEvaluated = true
                    Result.success('z')
                },
            ) { i, s, b, d, c ->
                "$i$s$b$d$c"
            }

        assertTrue(result.isFailure)
        assertFalse(thirdEvaluated)
        assertFalse(fourthEvaluated)
        assertFalse(fifthEvaluated)
    }
}
