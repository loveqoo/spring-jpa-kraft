package spring.kraft.entity.gen.generator

import spring.kraft.entity.gen.TableColumn
import spring.kraft.entity.gen.TableDef
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class EntityFileWriterTest {
    private val writer = EntityFileWriter()

    private fun column(
        name: String,
        typeName: String = "varchar",
        typeValue: Int? = null,
        primaryKey: Boolean = false,
        notNull: Boolean = true,
        unique: Boolean = false,
        autoIncrement: Boolean = false,
    ) = TableColumn(
        name = name,
        typeName = typeName,
        typeValue = typeValue,
        primaryKey = primaryKey,
        notNull = notNull,
        unique = unique,
        autoIncrement = autoIncrement,
        defaultValue = null,
        note = null,
    )

    @Test
    fun `generate standalone BaseEntity`() {
        val classified =
            ColumnClassifier.classify(
                TableDef(
                    name = "products",
                    schema = null,
                    columns =
                        listOf(
                            column("id", "bigint", primaryKey = true, autoIncrement = true),
                            column("name", "varchar", typeValue = 255, unique = true),
                            column("price", "decimal"),
                            column("created_at", "timestamp"),
                            column("updated_at", "timestamp"),
                        ),
                    indexes = emptyList(),
                ),
                isAggregateRoot = false,
                joinColumns = emptySet(),
            )

        val metadata =
            EntityMetadata(
                tableName = "products",
                className = "Product",
                packageName = "com.example.entity",
                basePackage = "com.example",
                isAggregateRoot = false,
                classifiedColumns = classified,
                relations = emptyList(),
                reverseRelations = emptyList(),
            )

        val result = writer.write(metadata)

        assertContains(result, "package com.example.entity")
        assertContains(result, "import spring.kraft.jpa.BaseEntity")
        assertContains(result, "import spring.kraft.jpa.IdentityColumn")
        assertContains(result, "import java.math.BigDecimal")
        assertContains(result, "@Entity")
        assertContains(result, "@Table(name = \"products\")")
        assertContains(result, "class Product(")
        assertContains(result, ": BaseEntity<Long>()")
        assertContains(result, "@get:IdentityColumn")
        assertContains(result, "@Column(name = \"name\", nullable = false, unique = true, length = 255)")
        assertContains(result, "val name: String")
        assertContains(result, "val price: BigDecimal")
        assertContains(result, "@Id")
        assertContains(result, "@GeneratedValue(strategy = GenerationType.IDENTITY)")
        assertContains(result, "override var id: Long? = null")
        // audit columns should NOT be present
        assertFalse(result.contains("createdAt"))
        assertFalse(result.contains("updatedAt"))
    }

    @Test
    fun `generate aggregate root entity`() {
        val classified =
            ColumnClassifier.classify(
                TableDef(
                    name = "orders",
                    schema = null,
                    columns =
                        listOf(
                            column("id", "bigint", primaryKey = true, autoIncrement = true),
                            column("name", "varchar", typeValue = 255, unique = true),
                            column("status", "varchar", typeValue = 50),
                            column("version", "bigint"),
                            column("deleted", "boolean"),
                            column("created_at", "timestamp"),
                            column("created_by", "varchar", typeValue = 255),
                            column("updated_at", "timestamp"),
                            column("updated_by", "varchar", typeValue = 255),
                        ),
                    indexes = emptyList(),
                ),
                isAggregateRoot = true,
                joinColumns = emptySet(),
            )

        val reverseRelation =
            ResolvedRelation(
                type = "OneToMany",
                targetClassName = "OrderItem",
                joinColumnName = "order_id",
                propertyName = "orderItems",
                mappedBy = "order",
                nullable = false,
            )

        val metadata =
            EntityMetadata(
                tableName = "orders",
                className = "Order",
                packageName = "com.example.order.entity",
                basePackage = "com.example.order",
                isAggregateRoot = true,
                classifiedColumns = classified,
                relations = emptyList(),
                reverseRelations = listOf(reverseRelation),
            )

        val result = writer.write(metadata)

        assertContains(result, "import spring.kraft.jpa.AggregateRootBaseEntity")
        assertContains(result, ": AggregateRootBaseEntity<Long, Order>()")
        assertContains(result, "@get:IdentityColumn")
        assertContains(result, "val name: String")
        assertContains(result, "val status: String")
        assertContains(
            result,
            "@OneToMany(mappedBy = \"order\", cascade = [CascadeType.ALL], orphanRemoval = true)",
        )
        assertContains(result, "val orderItems: MutableList<OrderItem> = mutableListOf()")
        // skipped columns
        assertFalse(result.contains("val version"))
        assertFalse(result.contains("val deleted"))
        assertFalse(result.contains("val createdAt"))
    }

    @Test
    fun `generate child entity with ManyToOne relation`() {
        val classified =
            ColumnClassifier.classify(
                TableDef(
                    name = "order_items",
                    schema = null,
                    columns =
                        listOf(
                            column("id", "bigint", primaryKey = true, autoIncrement = true),
                            column("order_id", "bigint"),
                            column("product_name", "varchar", typeValue = 255),
                            column("quantity", "int"),
                            column("created_at", "timestamp"),
                            column("updated_at", "timestamp"),
                        ),
                    indexes = emptyList(),
                ),
                isAggregateRoot = false,
                joinColumns = setOf("order_id"),
            )

        val relation =
            ResolvedRelation(
                type = "ManyToOne",
                targetClassName = "Order",
                joinColumnName = "order_id",
                propertyName = "order",
                mappedBy = null,
                nullable = false,
            )

        val metadata =
            EntityMetadata(
                tableName = "order_items",
                className = "OrderItem",
                packageName = "com.example.order.entity",
                basePackage = "com.example.order",
                isAggregateRoot = false,
                classifiedColumns = classified,
                relations = listOf(relation),
                reverseRelations = emptyList(),
            )

        val result = writer.write(metadata)

        assertContains(result, "class OrderItem(")
        assertContains(result, ": BaseEntity<Long>()")
        assertContains(result, "@ManyToOne(fetch = FetchType.LAZY)")
        assertContains(result, "@JoinColumn(name = \"order_id\", nullable = false)")
        assertContains(result, "val order: Order")
        assertContains(result, "val productName: String")
        assertContains(result, "val quantity: Int")
        // order_id should not appear as a regular column
        assertFalse(result.contains("val orderId"))
    }

    @Test
    fun `generate entity with OneToOne reverse relation`() {
        val classified =
            ColumnClassifier.classify(
                TableDef(
                    name = "users",
                    schema = null,
                    columns =
                        listOf(
                            column("id", "bigint", primaryKey = true, autoIncrement = true),
                            column("email", "varchar", typeValue = 320, unique = true),
                        ),
                    indexes = emptyList(),
                ),
                isAggregateRoot = true,
                joinColumns = emptySet(),
            )

        val reverseRelation =
            ResolvedRelation(
                type = "OneToOne",
                targetClassName = "UserProfile",
                joinColumnName = "user_id",
                propertyName = "userProfile",
                mappedBy = "user",
                nullable = false,
            )

        val metadata =
            EntityMetadata(
                tableName = "users",
                className = "User",
                packageName = "com.example.entity",
                basePackage = "com.example",
                isAggregateRoot = true,
                classifiedColumns = classified,
                relations = emptyList(),
                reverseRelations = listOf(reverseRelation),
            )

        val result = writer.write(metadata)

        assertContains(
            result,
            "@OneToOne(mappedBy = \"user\", cascade = [CascadeType.ALL], orphanRemoval = true)",
        )
        assertContains(result, "val userProfile: UserProfile? = null")
    }

    @Test
    fun `column annotation includes length for varchar`() {
        val classified =
            ColumnClassifier.classify(
                TableDef(
                    name = "test",
                    schema = null,
                    columns =
                        listOf(
                            column("id", "bigint", primaryKey = true),
                            column("code", "varchar", typeValue = 50),
                            column("description", "text"),
                        ),
                    indexes = emptyList(),
                ),
                isAggregateRoot = false,
                joinColumns = emptySet(),
            )

        val metadata =
            EntityMetadata(
                tableName = "test",
                className = "Test",
                packageName = "com.example.entity",
                basePackage = "com.example",
                isAggregateRoot = false,
                classifiedColumns = classified,
                relations = emptyList(),
                reverseRelations = emptyList(),
            )

        val result = writer.write(metadata)

        assertContains(result, "length = 50")
        // text type should NOT have length
        assertTrue(result.contains("@Column(name = \"description\", nullable = false)"))
    }
}
