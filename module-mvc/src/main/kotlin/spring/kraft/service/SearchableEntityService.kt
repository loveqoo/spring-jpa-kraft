package spring.kraft.service

import org.springframework.data.domain.Page
import org.springframework.data.domain.PageRequest
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.domain.Specification
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.jpa.repository.JpaSpecificationExecutor
import org.springframework.transaction.annotation.Transactional
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.jpa.search.SearchFieldProvider
import spring.kraft.jpa.search.SearchSpecBuilder

interface SearchableEntityService<ID, E, R, in CF, in UF> :
    BaseEntityService<ID, E, CF, UF>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          CF : Any,
          UF : UpdateForm<ID>,
          R : JpaRepository<E, ID>,
          R : JpaSpecificationExecutor<E> {
    override val repo: R
    val searchFieldProvider: SearchFieldProvider<E>

    @Transactional(readOnly = true)
    fun search(
        params: Map<String, List<String>>,
        pageable: Pageable,
    ): Page<E> = search(SearchSpecBuilder.build(params, searchFieldProvider), pageable)

    @Transactional(readOnly = true)
    fun <T : Any> search(
        params: Map<String, List<String>>,
        pageable: Pageable,
        transformer: (e: E) -> T,
    ): Page<T> = search(params, pageable).map(transformer)

    @Transactional(readOnly = true)
    fun search(
        spec: Specification<E>?,
        pageable: Pageable,
    ): Page<E> {
        val effectivePageable = applyDefaultSort(pageable)
        return if (spec != null) {
            repo.findAll(spec, effectivePageable)
        } else {
            repo.findAll(effectivePageable)
        }
    }

    @Transactional(readOnly = true)
    fun <T : Any> search(
        spec: Specification<E>?,
        pageable: Pageable,
        transformer: (e: E) -> T,
    ): Page<T> = search(spec, pageable).map(transformer)

    private fun applyDefaultSort(pageable: Pageable): Pageable {
        val defaultSort = searchFieldProvider.defaultSort()
        return if (pageable.sort.isUnsorted && defaultSort.isSorted) {
            PageRequest.of(pageable.pageNumber, pageable.pageSize, defaultSort)
        } else {
            pageable
        }
    }
}
