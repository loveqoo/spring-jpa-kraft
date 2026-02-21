package spring.kraft.service

import org.junit.jupiter.api.Test
import org.mockito.kotlin.mock
import org.mockito.kotlin.never
import org.mockito.kotlin.verify
import org.springframework.data.jpa.repository.JpaRepository
import spring.kraft.service.fixture.OtherAggregateEntity
import spring.kraft.service.fixture.OtherAggregateRoot
import spring.kraft.service.fixture.TestAggregateEntity
import spring.kraft.service.fixture.TestAggregateRoot
import spring.kraft.service.fixture.TestServiceEntity

class AggregateRootAwareServiceTest {
    private val mockAggregateRootRepo: JpaRepository<TestAggregateRoot, Long> = mock()

    private val service =
        object : AggregateRootAwareService<Long, TestAggregateEntity, TestAggregateRoot> {
            override val aggregateRootRepo: JpaRepository<TestAggregateRoot, Long> = mockAggregateRootRepo
            override val entityType: Class<TestAggregateEntity> = TestAggregateEntity::class.java
        }

    @Test
    fun `publishEvent - AggregateRootAware 타입이면 aggregateRoot를 save`() {
        val root = TestAggregateRoot(id = 1L)
        val entity = TestAggregateEntity(id = 10L, root = root)

        service.publishEvent(entity)

        verify(mockAggregateRootRepo).save(root)
    }

    @Test
    fun `publishEvent - AggregateRootAware가 아닌 BaseEntity는 무시`() {
        val nonAwareEntity = TestServiceEntity(id = 1L, name = "plain")

        service.publishEvent(nonAwareEntity)

        verify(mockAggregateRootRepo, never()).save(org.mockito.kotlin.any())
    }

    @Test
    fun `publishEvent - 완전히 무관한 타입도 무시`() {
        service.publishEvent("not an entity")

        verify(mockAggregateRootRepo, never()).save(org.mockito.kotlin.any())
    }

    @Test
    fun `publishEvent - 다른 aggregate 계층의 AggregateRootAware는 무시`() {
        val otherRoot = OtherAggregateRoot(id = 2L)
        val otherEntity = OtherAggregateEntity(id = 20L, root = otherRoot)

        service.publishEvent(otherEntity)

        verify(mockAggregateRootRepo, never()).save(org.mockito.kotlin.any())
    }
}
