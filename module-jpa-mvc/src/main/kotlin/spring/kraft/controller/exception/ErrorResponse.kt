package spring.kraft.controller.exception

data class ErrorResponse(
    val status: Int,
    val error: String,
    val message: String,
    val details: List<FieldErrorDetail> = emptyList(),
)

data class FieldErrorDetail(
    val field: String,
    val message: String,
    val rejectedValue: Any? = null,
)
