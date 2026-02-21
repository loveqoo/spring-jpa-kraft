package spring.kraft.service

import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.querydsl.QuerydslPredicateExecutor
import org.springframework.data.repository.history.RevisionRepository
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity
import spring.kraft.jpa.repo.DynamicSearchRepository

interface SearchableRevisionEntityService<ID, E, R, in CF, in UF> :
    SearchableEntityService<ID, E, R, CF, UF>,
    RevisionEntityService<ID, E, R, CF, UF>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          CF : Any,
          UF : UpdateForm<ID>,
          R : JpaRepository<E, ID>,
          R : QuerydslPredicateExecutor<E>,
          R : DynamicSearchRepository<ID, E>,
          R : RevisionRepository<E, ID, Int> {
    override val repo: R
}
