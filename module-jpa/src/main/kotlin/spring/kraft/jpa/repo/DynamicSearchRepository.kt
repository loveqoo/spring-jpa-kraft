package spring.kraft.jpa.repo

import com.querydsl.jpa.JPQLQuery
import org.springframework.data.domain.Page
import org.springframework.data.domain.PageImpl
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.support.Querydsl
import spring.kraft.jpa.BaseEntity

interface DynamicSearchRepository<ID : Comparable<ID>, T : BaseEntity<ID>> {
    fun dynamicSearch(
        pageable: Pageable,
        customParam: Map<String, String>,
    ): Page<T>
}

fun <ID : Comparable<ID>, T : BaseEntity<ID>> JPQLQuery<T>.fetchPage(
    querydsl: Querydsl?,
    pageable: Pageable,
): Page<T> {
    val total = this.fetchCount()
    val list =
        checkNotNull(querydsl) { "Querydsl must not be null" }
            .applyPagination(pageable, this)
            .fetch()
    return PageImpl<T>(list, pageable, total)
}
