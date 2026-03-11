package spring.kraft.core

import java.time.LocalDateTime
import java.time.format.DateTimeFormatter

val defaultDatetimePattern: DateTimeFormatter = DateTimeFormatter.ofPattern("yyyy-MM-dd'T'HH:mm:ss")

fun LocalDateTime.toYmdHms(formatter: DateTimeFormatter = defaultDatetimePattern): Result<String> = runCatching { this.format(formatter) }
