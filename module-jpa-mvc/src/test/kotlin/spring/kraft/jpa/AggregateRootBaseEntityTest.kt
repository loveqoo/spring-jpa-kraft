package spring.kraft.jpa

import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import org.springframework.boot.jpa.test.autoconfigure.TestEntityManager
import org.springframework.context.annotation.Import
import org.springframework.data.jpa.repository.JpaRepository
import spring.kraft.jpa.config.TestJpaConfig
import spring.kraft.jpa.fixture.TestAggregateRootEntity
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertNotEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

@DataJpaTest
@Import(TestJpaConfig::class)
class AggregateRootBaseEntityTest(
    val repository: JpaRepository<TestAggregateRootEntity, Long>,
    val em: TestEntityManager,
) {
    @Test
    fun `@Version 초기값은 0`() {
        val entity = TestAggregateRootEntity("test")
        em.persistAndFlush(entity)

        assertEquals(0L, entity.versionNumber)
    }

    @Test
    fun `엔티티 수정 후 flush하면 versionNumber 증가`() {
        val entity = TestAggregateRootEntity("test")
        em.persistAndFlush(entity)
        val initialVersion = entity.versionNumber

        entity.versionUp()
        em.flush()

        assertTrue(entity.versionNumber > initialVersion)
    }

    @Test
    fun `versionUp 호출 시 updatedAt 갱신`() {
        val entity = TestAggregateRootEntity("test")
        em.persistAndFlush(entity)
        val beforeUpdatedAt = entity.updatedAt

        Thread.sleep(10)
        entity.versionUp()
        em.flush()

        assertNotNull(entity.updatedAt)
        assertNotEquals(beforeUpdatedAt, entity.updatedAt)
    }

    @Test
    fun `delete 호출 시 deleted가 true`() {
        val entity = TestAggregateRootEntity("test")
        em.persistAndFlush(entity)
        assertFalse(entity.deleted)

        entity.delete()

        assertTrue(entity.deleted)
    }

    @Test
    fun `같은 비즈니스 키 비영속 엔티티 equals 일치`() {
        val e1 = TestAggregateRootEntity("same-name")
        val e2 = TestAggregateRootEntity("same-name")

        assertEquals(e1, e2)
        assertEquals(e1.hashCode(), e2.hashCode())
    }

    @Test
    fun `다른 비즈니스 키 비영속 엔티티 equals 불일치`() {
        val e1 = TestAggregateRootEntity("name-a")
        val e2 = TestAggregateRootEntity("name-b")

        assertNotEquals(e1, e2)
    }

    @Test
    fun `영속 엔티티 같은 id equals 일치`() {
        val entity = em.persistAndFlush(TestAggregateRootEntity("test"))
        em.clear()

        val found = repository.findById(entity.id!!).get()
        assertEquals(entity, found)
        assertEquals(entity.hashCode(), found.hashCode())
    }

    @Test
    fun `영속 vs 비영속 엔티티 equals는 false`() {
        val transientEntity = TestAggregateRootEntity("test")
        val persistedEntity = em.persistAndFlush(TestAggregateRootEntity("test"))

        assertFalse(transientEntity.equals(persistedEntity))
        assertFalse(persistedEntity.equals(transientEntity))
    }

    @Test
    fun `영속 엔티티 다른 id equals 불일치`() {
        val e1 = em.persistAndFlush(TestAggregateRootEntity("name-a"))
        val e2 = em.persistAndFlush(TestAggregateRootEntity("name-b"))

        assertNotEquals(e1, e2)
    }
}
