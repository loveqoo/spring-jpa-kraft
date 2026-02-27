package spring.kraft.ksp.processor

import com.google.devtools.ksp.symbol.KSClassDeclaration
import com.google.devtools.ksp.symbol.KSType

data class ServiceEntry(
    val classDeclaration: KSClassDeclaration,
    val rootType: KSType,
    val entityName: String,
    val idType: KSType,
    val entityType: KSType,
    val createFormType: KSType?,
    val updateFormType: KSType?,
    val isMutable: Boolean,
    val excludedMethods: Set<String>,
    val customMethods: List<CustomMethodEntry>,
    val mediatorPackage: String,
)
