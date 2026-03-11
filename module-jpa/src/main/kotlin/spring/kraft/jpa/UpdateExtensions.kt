package spring.kraft.jpa

fun <T : Any> T.updateProperty(
    newValue: T?,
    setter: (T) -> Unit,
): Result<Unit> =
    runCatching {
        newValue?.let(setter)
    }

fun <T : Any> T?.updateEntity(
    newEntity: T?,
    setter: (T) -> Unit,
): Result<Unit> =
    runCatching {
        newEntity?.let(setter)
    }
