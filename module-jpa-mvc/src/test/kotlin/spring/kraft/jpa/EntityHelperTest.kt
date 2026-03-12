package spring.kraft.jpa

import spring.kraft.jpa.fixture.NoIdentityColumnEntity
import spring.kraft.jpa.fixture.TestBaseEntity
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class EntityHelperTest {
    @Test
    fun `compareTo - 둘 다 영속이면 성공`() {
        val e1 = TestBaseEntity("a").apply { id = 1L }
        val e2 = TestBaseEntity("b").apply { id = 2L }

        val result = EntityHelper.compareTo(e1, e2)

        assertTrue(result.isSuccess)
        assertTrue(result.getOrThrow() < 0)
    }

    @Test
    fun `compareTo - 같은 id이면 0`() {
        val e1 = TestBaseEntity("a").apply { id = 1L }
        val e2 = TestBaseEntity("b").apply { id = 1L }

        val result = EntityHelper.compareTo(e1, e2)

        assertTrue(result.isSuccess)
        assertEquals(0, result.getOrThrow())
    }

    @Test
    fun `compareTo - 하나라도 비영속이면 실패`() {
        val persisted = TestBaseEntity("a").apply { id = 1L }
        val transient = TestBaseEntity("b")

        val result = EntityHelper.compareTo(persisted, transient)

        assertTrue(result.isFailure)
    }

    @Test
    fun `compareTo - 둘 다 비영속이면 실패`() {
        val e1 = TestBaseEntity("a")
        val e2 = TestBaseEntity("b")

        val result = EntityHelper.compareTo(e1, e2)

        assertTrue(result.isFailure)
    }

    @Test
    fun `transientEquals - 같은 비즈니스 키이면 true`() {
        val e1 = TestBaseEntity("same")
        val e2 = TestBaseEntity("same")

        assertTrue(EntityHelper.transientEquals(e1, e2))
    }

    @Test
    fun `transientEquals - 다른 비즈니스 키이면 false`() {
        val e1 = TestBaseEntity("a")
        val e2 = TestBaseEntity("b")

        assertFalse(EntityHelper.transientEquals(e1, e2))
    }

    @Test
    fun `transientHashCode - 같은 비즈니스 키이면 같은 해시`() {
        val e1 = TestBaseEntity("same")
        val e2 = TestBaseEntity("same")

        assertEquals(
            EntityHelper.transientHashCode(e1),
            EntityHelper.transientHashCode(e2),
        )
    }

    @Test
    fun `transientEquals - IdentityColumn 없으면 false`() {
        val e1 = NoIdentityColumnEntity("same")
        val e2 = NoIdentityColumnEntity("same")

        assertFalse(EntityHelper.transientEquals(e1, e2))
    }

    @Test
    fun `transientHashCode - IdentityColumn 없어도 예외 없이 동작`() {
        val e1 = NoIdentityColumnEntity("test")
        val e2 = NoIdentityColumnEntity("test")

        assertEquals(
            EntityHelper.transientHashCode(e1),
            EntityHelper.transientHashCode(e2),
        )
    }

    @Test
    fun `transientHashCode - 다른 비즈니스 키이면 다른 해시`() {
        val e1 = TestBaseEntity("a")
        val e2 = TestBaseEntity("b")

        // 해시 충돌 가능성은 있지만 다른 값에 대해 일반적으로 다른 해시를 기대
        assertTrue(
            EntityHelper.transientHashCode(e1) != EntityHelper.transientHashCode(e2),
        )
    }
}
