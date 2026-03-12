package spring.kraft.jpa.type

import java.time.LocalDateTime

interface Traceable {
    val createdAt: LocalDateTime?
    val createdBy: String?
    val updatedAt: LocalDateTime?
    val updatedBy: String?

    object Columns {
        object CreatedAt {
            const val NAME = "created_at"
        }

        object CreatedBy {
            const val NAME = "created_by"
            const val LENGTH = 100
        }

        object UpdatedAt {
            const val NAME = "updated_at"
        }

        object UpdatedBy {
            const val NAME = "updated_by"
            const val LENGTH = 100
        }
    }
}
