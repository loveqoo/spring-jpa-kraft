package spring.kraft.jpa.type

import org.hibernate.Hibernate

interface Identifiable {
    var id: Long?
    val isNew: Boolean
}

/**
 * [org.springframework.data.jpa.repository.JpaRepository.getReferenceById]의 결과가 Proxy를 리턴하므로 실제 객체를 조회하기 위해 필요하다.
 */
fun <T : Identifiable> T.unproxy(): T = this.also(Hibernate::unproxy)
