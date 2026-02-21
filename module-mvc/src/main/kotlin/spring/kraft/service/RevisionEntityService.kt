package spring.kraft.service

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.history.Revision
import org.springframework.data.history.Revisions
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.repository.history.RevisionRepository
import org.springframework.transaction.annotation.Transactional
import spring.kraft.form.UpdateForm
import spring.kraft.jpa.BaseEntity

interface RevisionEntityService<ID, E, R, in CF, in UF> :
    BaseEntityService<ID, E, CF, UF>
    where ID : Comparable<ID>,
          E : BaseEntity<ID>,
          CF : Any,
          UF : UpdateForm<ID>,
          R : JpaRepository<E, ID>,
          R : RevisionRepository<E, ID, Int> {
    override val repo: R

    @Transactional(readOnly = true)
    fun findRevisions(id: ID): Revisions<Int, E> = Revisions.of(repo.findRevisions(id).toList())

    @Transactional(readOnly = true)
    fun <T : Any> findRevisions(
        id: ID,
        transformer: (E) -> T,
    ): Revisions<Int, T> =
        Revisions.of(
            repo
                .findRevisions(id)
                .map { revision ->
                    Revision.of(revision.metadata, transformer(revision.entity))
                }.toList(),
        )

    @Transactional(readOnly = true)
    fun findRevisionPages(
        id: ID,
        pageable: Pageable,
    ): Page<Revision<Int, E>> = repo.findRevisions(id, pageable)

    @Transactional(readOnly = true)
    fun <T : Any> findRevisionPages(
        id: ID,
        pageable: Pageable,
        transformer: (E) -> T,
    ): Page<Revision<Int, T>> =
        repo.findRevisions(id, pageable).map { revision ->
            Revision.of(revision.metadata, transformer(revision.entity))
        }
}
