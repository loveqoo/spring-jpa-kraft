@file:Suppress("unused")

package spring.kraft

import spring.kraft.controller.BaseEntityController
import spring.kraft.controller.ReadOnlyEntityController
import spring.kraft.controller.RevisionEntityController
import spring.kraft.controller.SearchableEntityController
import spring.kraft.controller.SearchableRevisionEntityController
import spring.kraft.controller.delegator.BaseEntityDelegator
import spring.kraft.controller.delegator.ReadOnlyDelegator
import spring.kraft.controller.delegator.RevisionEntityDelegator
import spring.kraft.controller.delegator.SearchableEntityDelegator
import spring.kraft.controller.delegator.SearchableRevisionEntityDelegator
import spring.kraft.controller.mapper.BaseEntityMapper
import spring.kraft.controller.mapper.ReadOnlyMapper
import spring.kraft.controller.mapper.RevisionEntityMapper
import spring.kraft.form.FormResolver
import spring.kraft.form.FormResolver0
import spring.kraft.form.UpdateForm
import spring.kraft.service.AggregateRootAwareService
import spring.kraft.service.BaseEntityService
import spring.kraft.service.ReadOnlyEntityService
import spring.kraft.service.RevisionEntityService
import spring.kraft.service.SearchableEntityService
import spring.kraft.service.SearchableRevisionEntityService

// ── UpdateForm ──

typealias LongUpdateForm = UpdateForm<Long>

// ── FormResolver ──

typealias LongFormResolver<E, CF, UF> = FormResolver<Long, E, CF, UF>

typealias LongFormResolver0<E, CF, UF> = FormResolver0<Long, E, CF, UF>

// ── Mapper ──

typealias LongReadOnlyMapper<E, D> = ReadOnlyMapper<Long, E, D>

typealias LongBaseEntityMapper<E, D> = BaseEntityMapper<Long, E, D>

typealias LongRevisionEntityMapper<E, D> = RevisionEntityMapper<Long, E, D>

// ── Service ──

typealias LongReadOnlyEntityService<E> = ReadOnlyEntityService<Long, E>

typealias LongBaseEntityService<E, CF, UF> = BaseEntityService<Long, E, CF, UF>

typealias LongSearchableEntityService<E, R, CF, UF> = SearchableEntityService<Long, E, R, CF, UF>

typealias LongRevisionEntityService<E, R, CF, UF> = RevisionEntityService<Long, E, R, CF, UF>

typealias LongSearchableRevisionEntityService<E, R, CF, UF> =
    SearchableRevisionEntityService<Long, E, R, CF, UF>

typealias LongAggregateRootAwareService<E, RE> = AggregateRootAwareService<Long, E, RE>

// ── Controller ──

typealias LongReadOnlyEntityController<E, S, D> = ReadOnlyEntityController<Long, E, S, D>

typealias LongBaseEntityController<E, S, D, CF, UF> = BaseEntityController<Long, E, S, D, CF, UF>

typealias LongSearchableEntityController<E, R, S, D, CF, UF> =
    SearchableEntityController<Long, E, R, S, D, CF, UF>

typealias LongRevisionEntityController<E, R, S, D, CF, UF> =
    RevisionEntityController<Long, E, R, S, D, CF, UF>

typealias LongSearchableRevisionEntityController<E, R, S, D, CF, UF> =
    SearchableRevisionEntityController<Long, E, R, S, D, CF, UF>

// ── Delegator ──

typealias LongReadOnlyDelegator<E, S, D> = ReadOnlyDelegator<Long, E, S, D>

typealias LongBaseEntityDelegator<E, S, D, CF, UF> =
    BaseEntityDelegator<Long, E, S, D, CF, UF>

typealias LongSearchableEntityDelegator<E, R, S, D, CF, UF> =
    SearchableEntityDelegator<Long, E, R, S, D, CF, UF>

typealias LongRevisionEntityDelegator<E, R, S, D, CF, UF> =
    RevisionEntityDelegator<Long, E, R, S, D, CF, UF>

typealias LongSearchableRevisionEntityDelegator<E, R, S, D, CF, UF> =
    SearchableRevisionEntityDelegator<Long, E, R, S, D, CF, UF>
