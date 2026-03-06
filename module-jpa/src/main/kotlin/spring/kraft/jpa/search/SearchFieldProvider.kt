package spring.kraft.jpa.search

import org.springframework.data.domain.Sort

interface SearchFieldProvider<E> {
    fun customize(binder: SearchBinder<E>) {}

    fun defaultSort(): Sort = Sort.unsorted()
}
