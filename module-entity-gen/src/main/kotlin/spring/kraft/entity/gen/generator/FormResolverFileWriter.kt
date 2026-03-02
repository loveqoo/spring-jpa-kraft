package spring.kraft.entity.gen.generator

class FormResolverFileWriter {
    fun write(metadata: EntityMetadata): String {
        val count = metadata.forwardRelationCount
        return when (count) {
            0 -> writeFormResolver0(metadata)
            1 -> writeFormResolver1(metadata)
            2 -> writeFormResolver2(metadata)
            3 -> writeFormResolver3(metadata)
            4 -> writeFormResolver4(metadata)
            else -> error("FormResolver supports at most 4 parent relations, got $count")
        }
    }

    private fun writeFormResolver0(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val servicePackage = "${metadata.basePackage}.service"
        val entityPackage = "${metadata.basePackage}.entity"
        val formPackage = "${metadata.basePackage}.form"
        val repoPackage = "${metadata.basePackage}.repository"
        val cls = metadata.className

        sb.appendLine("package $servicePackage")
        sb.appendLine()
        sb.appendLine("import $entityPackage.$cls")
        sb.appendLine("import $formPackage.${cls}CreateForm")
        sb.appendLine("import $formPackage.${cls}UpdateForm")
        sb.appendLine("import $repoPackage.${cls}Repository")
        sb.appendLine("import jakarta.validation.Validator")
        sb.appendLine("import org.springframework.stereotype.Component")
        sb.appendLine("import spring.kraft.form.FormResolver0")
        sb.appendLine()

        sb.appendLine("@Component")
        sb.appendLine("class ${cls}FormResolver(")
        sb.appendLine("    override val repo: ${cls}Repository,")
        sb.appendLine("    override val validator: Validator,")
        sb.appendLine(") : FormResolver0<${metadata.idType}, $cls, ${cls}CreateForm, ${cls}UpdateForm>() {")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}CreateForm.createEntity(): Result<$cls> =")
        sb.appendLine("        Result.success($cls(${buildCreateArgs(metadata)}))")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}UpdateForm.update(entity: $cls): Result<Unit> {")
        sb.appendLine("        // TODO: implement update logic")
        sb.appendLine("        return Result.success(Unit)")
        sb.appendLine("    }")
        sb.appendLine("}")
        sb.appendLine()

        return sb.toString()
    }

    private fun writeFormResolver1(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val servicePackage = "${metadata.basePackage}.service"
        val entityPackage = "${metadata.basePackage}.entity"
        val formPackage = "${metadata.basePackage}.form"
        val repoPackage = "${metadata.basePackage}.repository"
        val cls = metadata.className
        val parent = metadata.relations.first { it.type == "ManyToOne" || it.type == "OneToOne" }
        val parentCls = parent.targetClassName
        val parentIdField = NameConverter.toPropertyName(parent.joinColumnName)
        val parentIdType = parent.targetIdType

        sb.appendLine("package $servicePackage")
        sb.appendLine()
        sb.appendLine("import $entityPackage.$cls")
        sb.appendLine("import $entityPackage.$parentCls")
        sb.appendLine("import $formPackage.${cls}CreateForm")
        sb.appendLine("import $formPackage.${cls}UpdateForm")
        sb.appendLine("import $repoPackage.${cls}Repository")
        sb.appendLine("import $repoPackage.${parentCls}Repository")
        sb.appendLine("import jakarta.validation.Validator")
        sb.appendLine("import org.springframework.stereotype.Component")
        sb.appendLine("import spring.kraft.form.FormResolver1")
        sb.appendLine()

        sb.appendLine("@Component")
        sb.appendLine("class ${cls}FormResolver(")
        sb.appendLine("    override val repo: ${cls}Repository,")
        sb.appendLine("    override val repo1: ${parentCls}Repository,")
        sb.appendLine("    override val validator: Validator,")
        sb.appendLine(
            ") : FormResolver1<${metadata.idType}, $cls, ${cls}CreateForm, ${cls}UpdateForm, $parentIdType, $parentCls>() {",
        )
        sb.appendLine()
        sb.appendLine("    override fun ${cls}CreateForm.parentId(): Result<$parentIdType> =")
        sb.appendLine("        ${parentIdExpression(parentIdField, parent.nullable)}")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}CreateForm.toEntity(p1: $parentCls): Result<$cls> =")
        sb.appendLine("        Result.success($cls(${buildCreateArgsWithParent(metadata, parent)}))")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}UpdateForm.parentId(): Result<$parentIdType?> =")
        sb.appendLine("        Result.success($parentIdField)")
        sb.appendLine()
        sb.appendLine(
            "    override fun ${cls}UpdateForm.update(entity: $cls, parent: $parentCls?): Result<Unit> {",
        )
        sb.appendLine("        // TODO: implement update logic")
        sb.appendLine("        return Result.success(Unit)")
        sb.appendLine("    }")
        sb.appendLine("}")
        sb.appendLine()

        return sb.toString()
    }

    private fun writeFormResolver2(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val servicePackage = "${metadata.basePackage}.service"
        val entityPackage = "${metadata.basePackage}.entity"
        val formPackage = "${metadata.basePackage}.form"
        val repoPackage = "${metadata.basePackage}.repository"
        val cls = metadata.className
        val parents = metadata.relations.filter { it.type == "ManyToOne" || it.type == "OneToOne" }
        val p1 = parents[0]
        val p2 = parents[1]

        sb.appendLine("package $servicePackage")
        sb.appendLine()
        sb.appendLine("import $entityPackage.$cls")
        sb.appendLine("import $entityPackage.${p1.targetClassName}")
        sb.appendLine("import $entityPackage.${p2.targetClassName}")
        sb.appendLine("import $formPackage.${cls}CreateForm")
        sb.appendLine("import $formPackage.${cls}UpdateForm")
        sb.appendLine("import $repoPackage.${cls}Repository")
        sb.appendLine("import $repoPackage.${p1.targetClassName}Repository")
        sb.appendLine("import $repoPackage.${p2.targetClassName}Repository")
        sb.appendLine("import jakarta.validation.Validator")
        sb.appendLine("import org.springframework.stereotype.Component")
        sb.appendLine("import spring.kraft.form.FormResolver2")
        sb.appendLine()

        val p1IdField = NameConverter.toPropertyName(p1.joinColumnName)
        val p2IdField = NameConverter.toPropertyName(p2.joinColumnName)

        sb.appendLine("@Component")
        sb.appendLine("class ${cls}FormResolver(")
        sb.appendLine("    override val repo: ${cls}Repository,")
        sb.appendLine("    override val repo1: ${p1.targetClassName}Repository,")
        sb.appendLine("    override val repo2: ${p2.targetClassName}Repository,")
        sb.appendLine("    override val validator: Validator,")
        sb.appendLine(
            ") : FormResolver2<${metadata.idType}, $cls, ${cls}CreateForm, ${cls}UpdateForm, " +
                "${p1.targetIdType}, ${p1.targetClassName}, ${p2.targetIdType}, ${p2.targetClassName}>() {",
        )
        sb.appendLine()
        sb.appendLine("    override fun ${cls}CreateForm.parentId1(): Result<${p1.targetIdType}> =")
        sb.appendLine("        ${parentIdExpression(p1IdField, p1.nullable)}")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}CreateForm.parentId2(): Result<${p2.targetIdType}> =")
        sb.appendLine("        ${parentIdExpression(p2IdField, p2.nullable)}")
        sb.appendLine()
        sb.appendLine(
            "    override fun ${cls}CreateForm.toEntity(" +
                "p1: ${p1.targetClassName}, p2: ${p2.targetClassName}): Result<$cls> =",
        )
        sb.appendLine("        Result.success($cls(${buildCreateArgsWithParents(metadata, listOf(p1, p2))}))")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}UpdateForm.parentId1(): Result<${p1.targetIdType}?> =")
        sb.appendLine("        Result.success($p1IdField)")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}UpdateForm.parentId2(): Result<${p2.targetIdType}?> =")
        sb.appendLine("        Result.success($p2IdField)")
        sb.appendLine()
        sb.appendLine(
            "    override fun ${cls}UpdateForm.update(" +
                "entity: $cls, parent1: ${p1.targetClassName}?, parent2: ${p2.targetClassName}?): Result<Unit> {",
        )
        sb.appendLine("        // TODO: implement update logic")
        sb.appendLine("        return Result.success(Unit)")
        sb.appendLine("    }")
        sb.appendLine("}")
        sb.appendLine()

        return sb.toString()
    }

    private fun writeFormResolver3(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val servicePackage = "${metadata.basePackage}.service"
        val entityPackage = "${metadata.basePackage}.entity"
        val formPackage = "${metadata.basePackage}.form"
        val repoPackage = "${metadata.basePackage}.repository"
        val cls = metadata.className
        val parents = metadata.relations.filter { it.type == "ManyToOne" || it.type == "OneToOne" }
        val p1 = parents[0]
        val p2 = parents[1]
        val p3 = parents[2]

        sb.appendLine("package $servicePackage")
        sb.appendLine()
        sb.appendLine("import $entityPackage.$cls")
        sb.appendLine("import $entityPackage.${p1.targetClassName}")
        sb.appendLine("import $entityPackage.${p2.targetClassName}")
        sb.appendLine("import $entityPackage.${p3.targetClassName}")
        sb.appendLine("import $formPackage.${cls}CreateForm")
        sb.appendLine("import $formPackage.${cls}UpdateForm")
        sb.appendLine("import $repoPackage.${cls}Repository")
        sb.appendLine("import $repoPackage.${p1.targetClassName}Repository")
        sb.appendLine("import $repoPackage.${p2.targetClassName}Repository")
        sb.appendLine("import $repoPackage.${p3.targetClassName}Repository")
        sb.appendLine("import jakarta.validation.Validator")
        sb.appendLine("import org.springframework.stereotype.Component")
        sb.appendLine("import spring.kraft.form.FormResolver3")
        sb.appendLine()

        val p1Id = NameConverter.toPropertyName(p1.joinColumnName)
        val p2Id = NameConverter.toPropertyName(p2.joinColumnName)
        val p3Id = NameConverter.toPropertyName(p3.joinColumnName)

        sb.appendLine("@Component")
        sb.appendLine("class ${cls}FormResolver(")
        sb.appendLine("    override val repo: ${cls}Repository,")
        sb.appendLine("    override val repo1: ${p1.targetClassName}Repository,")
        sb.appendLine("    override val repo2: ${p2.targetClassName}Repository,")
        sb.appendLine("    override val repo3: ${p3.targetClassName}Repository,")
        sb.appendLine("    override val validator: Validator,")
        sb.appendLine(
            ") : FormResolver3<${metadata.idType}, $cls, ${cls}CreateForm, ${cls}UpdateForm, " +
                "${p1.targetIdType}, ${p1.targetClassName}, " +
                "${p2.targetIdType}, ${p2.targetClassName}, " +
                "${p3.targetIdType}, ${p3.targetClassName}>() {",
        )
        sb.appendLine()
        sb.appendLine("    override fun ${cls}CreateForm.parentId1(): Result<${p1.targetIdType}> =")
        sb.appendLine("        ${parentIdExpression(p1Id, p1.nullable)}")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}CreateForm.parentId2(): Result<${p2.targetIdType}> =")
        sb.appendLine("        ${parentIdExpression(p2Id, p2.nullable)}")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}CreateForm.parentId3(): Result<${p3.targetIdType}> =")
        sb.appendLine("        ${parentIdExpression(p3Id, p3.nullable)}")
        sb.appendLine()
        sb.appendLine(
            "    override fun ${cls}CreateForm.toEntity(" +
                "p1: ${p1.targetClassName}, p2: ${p2.targetClassName}, " +
                "p3: ${p3.targetClassName}): Result<$cls> =",
        )
        sb.appendLine(
            "        Result.success($cls(${buildCreateArgsWithParents(metadata, listOf(p1, p2, p3))}))",
        )
        sb.appendLine()
        sb.appendLine("    override fun ${cls}UpdateForm.parentId1(): Result<${p1.targetIdType}?> =")
        sb.appendLine("        Result.success($p1Id)")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}UpdateForm.parentId2(): Result<${p2.targetIdType}?> =")
        sb.appendLine("        Result.success($p2Id)")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}UpdateForm.parentId3(): Result<${p3.targetIdType}?> =")
        sb.appendLine("        Result.success($p3Id)")
        sb.appendLine()
        sb.appendLine(
            "    override fun ${cls}UpdateForm.update(" +
                "entity: $cls, " +
                "parent1: ${p1.targetClassName}?, parent2: ${p2.targetClassName}?, " +
                "parent3: ${p3.targetClassName}?): Result<Unit> {",
        )
        sb.appendLine("        // TODO: implement update logic")
        sb.appendLine("        return Result.success(Unit)")
        sb.appendLine("    }")
        sb.appendLine("}")
        sb.appendLine()

        return sb.toString()
    }

    private fun writeFormResolver4(metadata: EntityMetadata): String {
        val sb = StringBuilder()
        val servicePackage = "${metadata.basePackage}.service"
        val entityPackage = "${metadata.basePackage}.entity"
        val formPackage = "${metadata.basePackage}.form"
        val repoPackage = "${metadata.basePackage}.repository"
        val cls = metadata.className
        val parents = metadata.relations.filter { it.type == "ManyToOne" || it.type == "OneToOne" }
        val p1 = parents[0]
        val p2 = parents[1]
        val p3 = parents[2]
        val p4 = parents[3]

        sb.appendLine("package $servicePackage")
        sb.appendLine()
        sb.appendLine("import $entityPackage.$cls")
        sb.appendLine("import $entityPackage.${p1.targetClassName}")
        sb.appendLine("import $entityPackage.${p2.targetClassName}")
        sb.appendLine("import $entityPackage.${p3.targetClassName}")
        sb.appendLine("import $entityPackage.${p4.targetClassName}")
        sb.appendLine("import $formPackage.${cls}CreateForm")
        sb.appendLine("import $formPackage.${cls}UpdateForm")
        sb.appendLine("import $repoPackage.${cls}Repository")
        sb.appendLine("import $repoPackage.${p1.targetClassName}Repository")
        sb.appendLine("import $repoPackage.${p2.targetClassName}Repository")
        sb.appendLine("import $repoPackage.${p3.targetClassName}Repository")
        sb.appendLine("import $repoPackage.${p4.targetClassName}Repository")
        sb.appendLine("import jakarta.validation.Validator")
        sb.appendLine("import org.springframework.stereotype.Component")
        sb.appendLine("import spring.kraft.form.FormResolver4")
        sb.appendLine()

        val p1Id = NameConverter.toPropertyName(p1.joinColumnName)
        val p2Id = NameConverter.toPropertyName(p2.joinColumnName)
        val p3Id = NameConverter.toPropertyName(p3.joinColumnName)
        val p4Id = NameConverter.toPropertyName(p4.joinColumnName)

        sb.appendLine("@Component")
        sb.appendLine("class ${cls}FormResolver(")
        sb.appendLine("    override val repo: ${cls}Repository,")
        sb.appendLine("    override val repo1: ${p1.targetClassName}Repository,")
        sb.appendLine("    override val repo2: ${p2.targetClassName}Repository,")
        sb.appendLine("    override val repo3: ${p3.targetClassName}Repository,")
        sb.appendLine("    override val repo4: ${p4.targetClassName}Repository,")
        sb.appendLine("    override val validator: Validator,")
        sb.appendLine(
            ") : FormResolver4<${metadata.idType}, $cls, ${cls}CreateForm, ${cls}UpdateForm, " +
                "${p1.targetIdType}, ${p1.targetClassName}, " +
                "${p2.targetIdType}, ${p2.targetClassName}, " +
                "${p3.targetIdType}, ${p3.targetClassName}, " +
                "${p4.targetIdType}, ${p4.targetClassName}>() {",
        )
        sb.appendLine()
        sb.appendLine("    override fun ${cls}CreateForm.parentId1(): Result<${p1.targetIdType}> =")
        sb.appendLine("        ${parentIdExpression(p1Id, p1.nullable)}")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}CreateForm.parentId2(): Result<${p2.targetIdType}> =")
        sb.appendLine("        ${parentIdExpression(p2Id, p2.nullable)}")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}CreateForm.parentId3(): Result<${p3.targetIdType}> =")
        sb.appendLine("        ${parentIdExpression(p3Id, p3.nullable)}")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}CreateForm.parentId4(): Result<${p4.targetIdType}> =")
        sb.appendLine("        ${parentIdExpression(p4Id, p4.nullable)}")
        sb.appendLine()
        sb.appendLine(
            "    override fun ${cls}CreateForm.toEntity(" +
                "p1: ${p1.targetClassName}, p2: ${p2.targetClassName}, " +
                "p3: ${p3.targetClassName}, p4: ${p4.targetClassName}): Result<$cls> =",
        )
        sb.appendLine(
            "        Result.success($cls(${buildCreateArgsWithParents(metadata, listOf(p1, p2, p3, p4))}))",
        )
        sb.appendLine()
        sb.appendLine("    override fun ${cls}UpdateForm.parentId1(): Result<${p1.targetIdType}?> =")
        sb.appendLine("        Result.success($p1Id)")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}UpdateForm.parentId2(): Result<${p2.targetIdType}?> =")
        sb.appendLine("        Result.success($p2Id)")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}UpdateForm.parentId3(): Result<${p3.targetIdType}?> =")
        sb.appendLine("        Result.success($p3Id)")
        sb.appendLine()
        sb.appendLine("    override fun ${cls}UpdateForm.parentId4(): Result<${p4.targetIdType}?> =")
        sb.appendLine("        Result.success($p4Id)")
        sb.appendLine()
        sb.appendLine(
            "    override fun ${cls}UpdateForm.update(" +
                "entity: $cls, " +
                "parent1: ${p1.targetClassName}?, parent2: ${p2.targetClassName}?, " +
                "parent3: ${p3.targetClassName}?, parent4: ${p4.targetClassName}?): Result<Unit> {",
        )
        sb.appendLine("        // TODO: implement update logic")
        sb.appendLine("        return Result.success(Unit)")
        sb.appendLine("    }")
        sb.appendLine("}")
        sb.appendLine()

        return sb.toString()
    }

    private fun parentIdExpression(
        fieldName: String,
        nullable: Boolean,
    ): String =
        if (nullable) {
            "$fieldName?.let { Result.success(it) }\n" +
                "            ?: Result.failure(IllegalArgumentException(\"$fieldName must not be null\"))"
        } else {
            "Result.success($fieldName)"
        }

    private fun buildCreateArgs(metadata: EntityMetadata): String {
        val args = mutableListOf<String>()
        metadata.normalColumns.forEach { classified ->
            val propName = NameConverter.toPropertyName(classified.column.name)
            args.add("$propName = $propName")
        }
        return args.joinToString(", ")
    }

    private fun buildCreateArgsWithParent(
        metadata: EntityMetadata,
        parent: ResolvedRelation,
    ): String = buildCreateArgsWithParents(metadata, listOf(parent))

    private fun buildCreateArgsWithParents(
        metadata: EntityMetadata,
        parents: List<ResolvedRelation>,
    ): String {
        val args = mutableListOf<String>()
        parents.forEachIndexed { index, parent ->
            args.add("${parent.propertyName} = p${index + 1}")
        }
        metadata.normalColumns.forEach { classified ->
            val propName = NameConverter.toPropertyName(classified.column.name)
            args.add("$propName = $propName")
        }
        return args.joinToString(", ")
    }
}
