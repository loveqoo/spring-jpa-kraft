package spring.kraft.controller.dto

import java.io.Serializable

data class MutationResponse(
    val action: String,
    val id: String,
    val name: String,
) : Serializable {
    companion object {
        fun create(
            id: Any,
            name: String,
        ) = MutationResponse("create", id.toString(), name)

        fun update(
            id: Any,
            name: String,
        ) = MutationResponse("update", id.toString(), name)

        fun delete(
            id: Any,
            name: String,
        ) = MutationResponse("delete", id.toString(), name)
    }
}
