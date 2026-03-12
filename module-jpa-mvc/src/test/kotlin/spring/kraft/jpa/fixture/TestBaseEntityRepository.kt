package spring.kraft.jpa.fixture

import org.springframework.data.jpa.repository.JpaRepository

interface TestBaseEntityRepository : JpaRepository<TestBaseEntity, Long>
