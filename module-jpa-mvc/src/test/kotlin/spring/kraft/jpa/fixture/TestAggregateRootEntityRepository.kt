package spring.kraft.jpa.fixture

import org.springframework.data.jpa.repository.JpaRepository

interface TestAggregateRootEntityRepository : JpaRepository<TestAggregateRootEntity, Long>
