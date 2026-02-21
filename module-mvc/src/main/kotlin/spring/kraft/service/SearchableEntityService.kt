package spring.kraft.service

import com.querydsl.core.types.Predicate
import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.querydsl.QuerydslPredicateExecutor
import org.springframework.transaction.annotation.Transactional
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.jpa.repo.DynamicSearchRepository

interface SearchableEntityService<ID, E, R, in CF, in UF> :
    BaseEntityService<ID, E, CF, UF>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          CF : Any,
          UF : UpdateForm<ID>,
          R : JpaRepository<E, ID>,
          R : QuerydslPredicateExecutor<E>,
          R : DynamicSearchRepository<ID, E> {
    override val repo: R

    @Transactional(readOnly = true)
    fun search(
        predicate: Predicate,
        pageable: Pageable,
    ): Page<E> = repo.findAll(predicate, pageable)

    @Transactional(readOnly = true)
    fun <T : Any> search(
        predicate: Predicate,
        pageable: Pageable,
        transformer: (e: E) -> T,
    ): Page<T> = repo.findAll(predicate, pageable).map(transformer)

    @Transactional(readOnly = true)
    fun searchCustom(
        customParams: Map<String, String>,
        pageable: Pageable,
    ): Page<E> = repo.dynamicSearch(pageable, customParams)

    @Transactional(readOnly = true)
    fun <T : Any> searchCustom(
        customParams: Map<String, String>,
        pageable: Pageable,
        transformer: (e: E) -> T,
    ): Page<T> = repo.dynamicSearch(pageable, customParams).map(transformer)
}
