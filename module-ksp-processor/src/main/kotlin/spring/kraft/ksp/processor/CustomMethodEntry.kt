package spring.kraft.ksp.processor

import com.google.devtools.ksp.symbol.KSFunctionDeclaration

data class CustomMethodEntry(
    val declaration: KSFunctionDeclaration,
    val overrideName: String,
    val isSuspend: Boolean,
)
