package spring.kraft.jpa.type

import org.hibernate.Hibernate

interface Identifiable<ID : Comparable<ID>> {
    var id: ID?
    val isNew: Boolean
}

/**
 * [org.springframework.data.jpa.repository.JpaRepository.getReferenceById]의 결과가 Proxy를 리턴하므로 실제 객체를 조회하기 위해 필요하다.
 */
fun <ID : Comparable<ID>, T : Identifiable<ID>> T.unproxy(): T = this.also(Hibernate::unproxy)
