package spring.kraft.jpa.search.fixture

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor

interface SearchTestEntityRepository :
    JpaRepository<SearchTestEntity, Long>,
    JpaSpecificationExecutor<SearchTestEntity>
