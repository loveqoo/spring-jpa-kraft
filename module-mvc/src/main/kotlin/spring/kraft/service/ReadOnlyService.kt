package spring.kraft.service

import org.springframework.data.domain.Page
import org.springframework.data.domain.Pageable
import org.springframework.data.jpa.repository.JpaRepository
import org.springframework.data.repository.findByIdOrNull
import org.springframework.transaction.annotation.Transactional
import spring.kraft.jpa.BaseEntity

interface ReadOnlyService<ID, E>
    where ID : Comparable<ID>,
          E : BaseEntity<ID> {
    val repo: JpaRepository<E, ID>
    val tableName: String

    @Transactional(readOnly = true)
    fun findById(id: ID): E? = repo.findByIdOrNull(id)

    @Transactional(readOnly = true)
    fun <T> findById(
        id: ID,
        transformer: (e: E) -> T,
    ): T? = repo.findById(id).map(transformer).orElse(null)

    @Transactional(readOnly = true)
    fun getOne(id: ID): E = repo.getReferenceById(id)

    @Transactional(readOnly = true)
    fun <T> getOne(
        id: ID,
        transformer: (e: E) -> T,
    ): T = transformer(repo.getReferenceById(id))

    @Transactional(readOnly = true)
    fun getByIdIn(ids: Collection<ID>): List<E> = repo.findAllById(ids)

    @Transactional(readOnly = true)
    fun <T> getByIdIn(
        ids: Collection<ID>,
        transformer: (e: E) -> T,
    ): List<T> = repo.findAllById(ids).map(transformer)

    @Transactional(readOnly = true)
    fun findAll(pageable: Pageable): Page<E> = repo.findAll(pageable)

    @Transactional(readOnly = true)
    fun <T : Any> findAll(
        pageable: Pageable,
        transformer: (e: E) -> T,
    ): Page<T> = repo.findAll(pageable).map(transformer)
}
