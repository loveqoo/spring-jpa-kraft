package spring.kraft.jpa.search

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class SearchBinderTest {
    @Test
    fun `bind - 필드에 연산자 바인딩`() {
        val binder = SearchBinder<Any>()
        binder.bind("name").to(SearchOp.LIKE)
        binder.bind("amount").to(SearchOp.GTE)

        assertEquals(SearchOp.LIKE, binder.bindings["name"])
        assertEquals(SearchOp.GTE, binder.bindings["amount"])
    }

    @Test
    fun `bind - 같은 필드 재바인딩시 덮어쓰기`() {
        val binder = SearchBinder<Any>()
        binder.bind("name").to(SearchOp.LIKE)
        binder.bind("name").to(SearchOp.EQ)

        assertEquals(SearchOp.EQ, binder.bindings["name"])
    }

    @Test
    fun `excluding - 제외 필드 등록`() {
        val binder = SearchBinder<Any>()
        binder.excluding("password", "secret")

        assertTrue(binder.excluded.contains("password"))
        assertTrue(binder.excluded.contains("secret"))
    }

    @Test
    fun `기본 상태 - 빈 바인딩과 제외 목록`() {
        val binder = SearchBinder<Any>()

        assertTrue(binder.bindings.isEmpty())
        assertTrue(binder.excluded.isEmpty())
        assertFalse(binder.allowUnbound)
    }

    @Test
    fun `allowUnboundFields - 미등록 필드 허용`() {
        val binder = SearchBinder<Any>()
        binder.allowUnboundFields()

        assertTrue(binder.allowUnbound)
    }
}
