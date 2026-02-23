package spring.kraft.controller.action

import spring.kraft.jpa.BaseEntity

interface SearchableRevisionEntityActionExtend<ID, E> :
    SearchableEntityActionExtend<ID, E>,
    RevisionEntityActionExtend<ID, E>
    where ID : Comparable<ID>, E : BaseEntity<ID>
