package spring.kraft.jpa

import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.context.annotation.Import
import org.springframework.data.jpa.repository.JpaRepository
import spring.kraft.jpa.config.TestJpaConfig
import spring.kraft.jpa.fixture.TestBaseEntity
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

@DataJpaTest
@Import(TestJpaConfig::class)
class BaseEntityTest(
    val repository: JpaRepository<TestBaseEntity, Long>,
    val em: TestEntityManager,
) {
    @Test
    fun `비영속 엔티티는 isNew이 true`() {
        val entity = TestBaseEntity("test")
        assertTrue(entity.isNew)
    }

    @Test
    fun `영속 후 isNew이 false`() {
        val entity = TestBaseEntity("test")
        em.persistAndFlush(entity)

        assertFalse(entity.isNew)
        assertNotNull(entity.id)
    }

    @Test
    fun `같은 비즈니스 키 비영속 엔티티 equals 일치`() {
        val e1 = TestBaseEntity("same-name")
        val e2 = TestBaseEntity("same-name")

        assertEquals(e1, e2)
        assertEquals(e1.hashCode(), e2.hashCode())
    }

    @Test
    fun `다른 비즈니스 키 비영속 엔티티 equals 불일치`() {
        val e1 = TestBaseEntity("name-a")
        val e2 = TestBaseEntity("name-b")

        assertNotEquals(e1, e2)
    }

    @Test
    fun `영속 엔티티 같은 id equals 일치`() {
        val entity = em.persistAndFlush(TestBaseEntity("test"))
        em.clear()

        val found = repository.findById(entity.id!!).get()
        assertEquals(entity, found)
        assertEquals(entity.hashCode(), found.hashCode())
    }

    @Test
    fun `영속 엔티티 다른 id equals 불일치`() {
        val e1 = em.persistAndFlush(TestBaseEntity("name-a"))
        val e2 = em.persistAndFlush(TestBaseEntity("name-b"))

        assertNotEquals(e1, e2)
    }

    @Test
    fun `audit 필드 자동 채워짐`() {
        val entity = TestBaseEntity("test")
        em.persistAndFlush(entity)

        assertNotNull(entity.createdAt)
        assertEquals("test-user", entity.createdBy)
        assertNotNull(entity.updatedAt)
        assertEquals("test-user", entity.updatedBy)
    }
}
