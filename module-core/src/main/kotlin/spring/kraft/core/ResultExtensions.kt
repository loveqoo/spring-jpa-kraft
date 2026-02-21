package spring.kraft.core

inline fun <T, R> Result<T>.flatMap(transform: (T) -> Result<R>): Result<R> =
    fold(
        onSuccess = { transform(it) },
        onFailure = { Result.failure(it) },
    )

inline fun <T, U, R> Result<T>.zip(
    other: Result<U>,
    transform: (T, U) -> R,
): Result<R> =
    flatMap { t ->
        other.map { u -> transform(t, u) }
    }

inline fun <T, U1, U2, R> Result<T>.zip(
    r2: Result<U1>,
    r3: Result<U2>,
    transform: (T, U1, U2) -> R,
): Result<R> =
    flatMap { t ->
        r2.flatMap { u1 ->
            r3.map { u2 -> transform(t, u1, u2) }
        }
    }

inline fun <T, U1, U2, U3, R> Result<T>.zip(
    r2: Result<U1>,
    r3: Result<U2>,
    r4: Result<U3>,
    transform: (T, U1, U2, U3) -> R,
): Result<R> =
    flatMap { t ->
        r2.flatMap { u1 ->
            r3.flatMap { u2 ->
                r4.map { u3 -> transform(t, u1, u2, u3) }
            }
        }
    }

inline fun <T, U1, U2, U3, U4, R> Result<T>.zip(
    r2: Result<U1>,
    r3: Result<U2>,
    r4: Result<U3>,
    r5: Result<U4>,
    transform: (T, U1, U2, U3, U4) -> R,
): Result<R> =
    flatMap { t ->
        r2.flatMap { u1 ->
            r3.flatMap { u2 ->
                r4.flatMap { u3 ->
                    r5.map { u4 -> transform(t, u1, u2, u3, u4) }
                }
            }
        }
    }

inline fun <T, U, R> Result<T>.zipLazy(
    other: () -> Result<U>,
    transform: (T, U) -> R,
): Result<R> =
    flatMap { t ->
        other().map { u -> transform(t, u) }
    }

inline fun <T, U1, U2, R> Result<T>.zipLazy(
    r2: () -> Result<U1>,
    r3: () -> Result<U2>,
    transform: (T, U1, U2) -> R,
): Result<R> =
    flatMap { t ->
        r2().flatMap { u1 ->
            r3().map { u2 -> transform(t, u1, u2) }
        }
    }

inline fun <T, U1, U2, U3, R> Result<T>.zipLazy(
    r2: () -> Result<U1>,
    r3: () -> Result<U2>,
    r4: () -> Result<U3>,
    transform: (T, U1, U2, U3) -> R,
): Result<R> =
    flatMap { t ->
        r2().flatMap { u1 ->
            r3().flatMap { u2 ->
                r4().map { u3 -> transform(t, u1, u2, u3) }
            }
        }
    }

inline fun <T, U1, U2, U3, U4, R> Result<T>.zipLazy(
    r2: () -> Result<U1>,
    r3: () -> Result<U2>,
    r4: () -> Result<U3>,
    r5: () -> Result<U4>,
    transform: (T, U1, U2, U3, U4) -> R,
): Result<R> =
    flatMap { t ->
        r2().flatMap { u1 ->
            r3().flatMap { u2 ->
                r4().flatMap { u3 ->
                    r5().map { u4 -> transform(t, u1, u2, u3, u4) }
                }
            }
        }
    }
