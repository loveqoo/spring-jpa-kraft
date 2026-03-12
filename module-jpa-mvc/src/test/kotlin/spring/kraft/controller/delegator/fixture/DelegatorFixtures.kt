package spring.kraft.controller.delegator.fixture

import spring.kraft.controller.mapper.BaseEntityMapper
import spring.kraft.controller.mapper.ReadOnlyMapper
import spring.kraft.controller.mapper.RevisionEntityMapper
import spring.kraft.service.fixture.TestServiceEntity

typealias TestReadOnlyMapper = ReadOnlyMapper<Long, TestServiceEntity, String>

typealias TestBaseEntityMapper = BaseEntityMapper<Long, TestServiceEntity, String>

typealias TestRevisionEntityMapper = RevisionEntityMapper<Long, TestServiceEntity, String>
