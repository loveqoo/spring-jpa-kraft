package spring.kraft.jpa

import org.hibernate.Hibernate
import java.time.LocalDateTime

interface Identifiable {
    var id: Long?
    val isNew: Boolean
    val createdAt: LocalDateTime?
    val createdBy: String?
    val updatedAt: LocalDateTime?
    val updatedBy: String?

    companion object {
        const val CREATED_AT = "created_at"
        const val CREATED_BY = "created_by"
        const val UPDATED_AT = "updated_at"
        const val UPDATED_BY = "updated_by"
    }
}

/**
 * [org.springframework.data.jpa.repository.JpaRepository.getReferenceById]의 결과가 Proxy를 리턴하므로 실제 객체를 조회하기 위해 필요하다.
 */
fun <T : Identifiable> T.unproxy(): T = this.also(Hibernate::unproxy)
