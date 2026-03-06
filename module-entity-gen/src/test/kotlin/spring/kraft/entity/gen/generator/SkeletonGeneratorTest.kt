package spring.kraft.entity.gen.generator

import spring.kraft.entity.gen.DdlParser
import spring.kraft.entity.gen.config.AggregateConfigParser
import java.io.File
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertTrue

class SkeletonGeneratorTest {
    private val ddlParser = DdlParser()
    private val configParser = AggregateConfigParser()
    private val generator = SkeletonGenerator()

    private val baseSql =
        """
        CREATE TABLE orders (
          id BIGINT NOT NULL AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL UNIQUE,
          status VARCHAR(50) NOT NULL,
          version BIGINT NOT NULL,
          deleted BOOLEAN NOT NULL,
          created_at TIMESTAMP,
          created_by VARCHAR(255),
          updated_at TIMESTAMP,
          updated_by VARCHAR(255),
          PRIMARY KEY (id)
        );

        CREATE TABLE order_items (
          id BIGINT NOT NULL AUTO_INCREMENT,
          order_id BIGINT NOT NULL,
          product_name VARCHAR(255) NOT NULL,
          quantity INT NOT NULL,
          price DECIMAL(10,2) NOT NULL,
          created_at TIMESTAMP,
          created_by VARCHAR(255),
          updated_at TIMESTAMP,
          updated_by VARCHAR(255),
          PRIMARY KEY (id)
        );

        CREATE TABLE products (
          id BIGINT NOT NULL AUTO_INCREMENT,
          name VARCHAR(255) NOT NULL UNIQUE,
          description TEXT,
          created_at TIMESTAMP,
          updated_at TIMESTAMP,
          PRIMARY KEY (id)
        );
        """.trimIndent()

    private val configJson =
        """
        {
          "basePackage": "com.example.order",
          "aggregates": [
            {
              "root": "orders",
              "relations": [
                { "type": "OneToMany", "target": "order_items", "joinColumn": "order_id" }
              ],
              "entities": [
                {
                  "table": "order_items",
                  "relations": [
                    { "type": "ManyToOne", "target": "orders", "joinColumn": "order_id" }
                  ]
                }
              ]
            }
          ]
        }
        """.trimIndent()

    @Test
    fun `generates all files in correct directories`() {
        val outputDir = createTempDir()
        try {
            generate(baseSql, configJson, outputDir)

            val base = "com/example/order"
            assertTrue(File(outputDir, "$base/entity/Order.kt").exists())
            assertTrue(File(outputDir, "$base/repository/OrderRepository.kt").exists())
            assertTrue(File(outputDir, "$base/form/OrderCreateForm.kt").exists())
            assertTrue(File(outputDir, "$base/form/OrderUpdateForm.kt").exists())
            assertTrue(File(outputDir, "$base/dto/OrderDto.kt").exists())
            assertTrue(File(outputDir, "$base/service/OrderFormResolver.kt").exists())
            assertTrue(File(outputDir, "$base/service/OrderSearchFields.kt").exists())
            assertTrue(File(outputDir, "$base/service/OrderService.kt").exists())
            assertTrue(File(outputDir, "$base/controller/OrderController.kt").exists())

            assertTrue(File(outputDir, "$base/entity/OrderItem.kt").exists())
            assertTrue(File(outputDir, "$base/repository/OrderItemRepository.kt").exists())
            assertTrue(File(outputDir, "$base/form/OrderItemCreateForm.kt").exists())
            assertTrue(File(outputDir, "$base/form/OrderItemUpdateForm.kt").exists())
            assertTrue(File(outputDir, "$base/dto/OrderItemDto.kt").exists())
            assertTrue(File(outputDir, "$base/service/OrderItemFormResolver.kt").exists())
            assertTrue(File(outputDir, "$base/service/OrderItemSearchFields.kt").exists())
            assertTrue(File(outputDir, "$base/service/OrderItemService.kt").exists())
            assertTrue(File(outputDir, "$base/controller/OrderItemController.kt").exists())

            assertTrue(File(outputDir, "$base/entity/Product.kt").exists())
            assertTrue(File(outputDir, "$base/repository/ProductRepository.kt").exists())
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `repository extends correct interfaces`() {
        val outputDir = createTempDir()
        try {
            generate(baseSql, configJson, outputDir)
            val source = readFile(outputDir, "com/example/order/repository/OrderRepository.kt")

            assertContains(source, "package com.example.order.repository")
            assertContains(source, "import com.example.order.entity.Order")
            assertContains(source, "JpaRepository<Order, Long>")
            assertContains(source, "JpaSpecificationExecutor<Order>")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `CreateForm contains normal columns`() {
        val outputDir = createTempDir()
        try {
            generate(baseSql, configJson, outputDir)
            val source = readFile(outputDir, "com/example/order/form/OrderCreateForm.kt")

            assertContains(source, "package com.example.order.form")
            assertContains(source, "data class OrderCreateForm(")
            assertContains(source, "val name: String")
            assertContains(source, "val status: String")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `child CreateForm includes parent ID field`() {
        val outputDir = createTempDir()
        try {
            generate(baseSql, configJson, outputDir)
            val source = readFile(outputDir, "com/example/order/form/OrderItemCreateForm.kt")

            assertContains(source, "val orderId: Long")
            assertContains(source, "val productName: String")
            assertContains(source, "val quantity: Int")
            assertContains(source, "val price: BigDecimal")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `UpdateForm has nullable fields and implements UpdateForm interface`() {
        val outputDir = createTempDir()
        try {
            generate(baseSql, configJson, outputDir)
            val source = readFile(outputDir, "com/example/order/form/OrderUpdateForm.kt")

            assertContains(source, "import spring.kraft.form.UpdateForm")
            assertContains(source, "override val id: Long")
            assertContains(source, "val name: String?")
            assertContains(source, "val status: String?")
            assertContains(source, ") : UpdateForm<Long>")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `Dto has id and normal columns with Serializable`() {
        val outputDir = createTempDir()
        try {
            generate(baseSql, configJson, outputDir)
            val source = readFile(outputDir, "com/example/order/dto/OrderDto.kt")

            assertContains(source, "package com.example.order.dto")
            assertContains(source, "import java.io.Serializable")
            assertContains(source, "data class OrderDto(")
            assertContains(source, "val id: Long")
            assertContains(source, "val name: String")
            assertContains(source, "val status: String")
            assertContains(source, ") : Serializable")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `aggregate root uses FormResolver0`() {
        val outputDir = createTempDir()
        try {
            generate(baseSql, configJson, outputDir)
            val source = readFile(outputDir, "com/example/order/service/OrderFormResolver.kt")

            assertContains(source, "import spring.kraft.form.FormResolver0")
            assertContains(source, "@Component")
            assertContains(source, "class OrderFormResolver(")
            assertContains(source, "override val repo: OrderRepository")
            assertContains(source, "override val validator: Validator")
            assertContains(source, ": FormResolver0<Long, Order, OrderCreateForm, OrderUpdateForm>()")
            assertContains(source, "override fun OrderCreateForm.createEntity(): Result<Order>")
            assertContains(source, "override fun OrderUpdateForm.update(entity: Order): Result<Unit>")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `child entity uses FormResolver1 with parent`() {
        val outputDir = createTempDir()
        try {
            generate(baseSql, configJson, outputDir)
            val source = readFile(outputDir, "com/example/order/service/OrderItemFormResolver.kt")

            assertContains(source, "import spring.kraft.form.FormResolver1")
            assertContains(source, "override val repo: OrderItemRepository")
            assertContains(source, "override val repo1: OrderRepository")
            assertContains(source, ": FormResolver1<Long, OrderItem, OrderItemCreateForm, OrderItemUpdateForm, Long, Order>()")
            assertContains(source, "override fun OrderItemCreateForm.parentId(): Result<Long>")
            assertContains(source, "Result.success(orderId)")
            assertContains(source, "override fun OrderItemCreateForm.toEntity(p1: Order): Result<OrderItem>")
            assertContains(source, "order = p1")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `service extends SearchableEntityService`() {
        val outputDir = createTempDir()
        try {
            generate(baseSql, configJson, outputDir)
            val source = readFile(outputDir, "com/example/order/service/OrderService.kt")

            assertContains(source, "@Service")
            assertContains(source, "class OrderService(")
            assertContains(source, "override val repo: OrderRepository")
            assertContains(source, "override val formResolver: FormResolver<Long, Order, OrderCreateForm, OrderUpdateForm>")
            assertContains(source, "override val searchFieldProvider: SearchFieldProvider<Order>")
            assertContains(source, ": SearchableEntityService<Long, Order, OrderRepository, OrderCreateForm, OrderUpdateForm>")
            assertContains(source, "override val tableName: String = \"orders\"")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `SearchFieldProvider binds String to LIKE and temporal to BETWEEN`() {
        val outputDir = createTempDir()
        try {
            generate(baseSql, configJson, outputDir)
            val source = readFile(outputDir, "com/example/order/service/OrderSearchFields.kt")

            assertContains(source, "@Component")
            assertContains(source, "class OrderSearchFields : SearchFieldProvider<Order>")
            assertContains(source, "binder.bind(\"name\").to(SearchOp.LIKE)")
            assertContains(source, "binder.bind(\"status\").to(SearchOp.LIKE)")
            assertContains(source, "binder.bind(\"createdAt\").to(SearchOp.BETWEEN)")
            assertContains(source, "binder.bind(\"updatedAt\").to(SearchOp.BETWEEN)")
            assertContains(source, "override fun defaultSort(): Sort = Sort.by(Sort.Direction.DESC, \"createdAt\")")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `controller extends SearchableEntityController`() {
        val outputDir = createTempDir()
        try {
            generate(baseSql, configJson, outputDir)
            val source = readFile(outputDir, "com/example/order/controller/OrderController.kt")

            assertContains(source, "@RestController")
            assertContains(source, "@RequestMapping(\"/api/orders\")")
            assertContains(source, "class OrderController(")
            assertContains(source, "override val service: OrderService")
            assertContains(
                source,
                "SearchableEntityController<Long, Order, OrderRepository, " +
                    "OrderService, OrderDto, OrderCreateForm, OrderUpdateForm>()",
            )
            assertContains(source, "override val tableName: String = \"orders\"")
            assertContains(source, "override fun toReadDto(entity: Order): OrderDto")
            assertContains(source, "override fun toCreateDto(entity: Order): MutationResponse")
            assertContains(source, "MutationResponse.create(entity.id!!, tableName)")
            assertContains(source, "override fun toUpdateDto(entity: Order): MutationResponse")
            assertContains(source, "override fun toDeleteDto(id: Long): MutationResponse")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `FormResolver2 generated for entity with two parents`() {
        val sql =
            """
            CREATE TABLE orders (
              id BIGINT NOT NULL AUTO_INCREMENT,
              name VARCHAR(255) NOT NULL,
              version BIGINT NOT NULL,
              deleted BOOLEAN NOT NULL,
              PRIMARY KEY (id)
            );
            CREATE TABLE products (
              id BIGINT NOT NULL AUTO_INCREMENT,
              name VARCHAR(255) NOT NULL,
              PRIMARY KEY (id)
            );
            CREATE TABLE order_items (
              id BIGINT NOT NULL AUTO_INCREMENT,
              order_id BIGINT NOT NULL,
              product_id BIGINT NOT NULL,
              quantity INT NOT NULL,
              PRIMARY KEY (id)
            );
            """.trimIndent()

        val config =
            """
            {
              "basePackage": "com.example.shop",
              "aggregates": [
                {
                  "root": "orders",
                  "relations": [
                    { "type": "OneToMany", "target": "order_items", "joinColumn": "order_id" }
                  ],
                  "entities": [
                    {
                      "table": "order_items",
                      "relations": [
                        { "type": "ManyToOne", "target": "orders", "joinColumn": "order_id" },
                        { "type": "ManyToOne", "target": "products", "joinColumn": "product_id" }
                      ]
                    }
                  ]
                }
              ]
            }
            """.trimIndent()

        val outputDir = createTempDir()
        try {
            generate(sql, config, outputDir)
            val source = readFile(outputDir, "com/example/shop/service/OrderItemFormResolver.kt")

            assertContains(source, "import spring.kraft.form.FormResolver2")
            assertContains(source, "override val repo1: OrderRepository")
            assertContains(source, "override val repo2: ProductRepository")
            assertContains(source, "FormResolver2<Long, OrderItem, OrderItemCreateForm, OrderItemUpdateForm, Long, Order, Long, Product>")
            assertContains(source, "override fun OrderItemCreateForm.parentId1(): Result<Long>")
            assertContains(source, "override fun OrderItemCreateForm.parentId2(): Result<Long>")
            assertContains(source, "override fun OrderItemCreateForm.toEntity(p1: Order, p2: Product): Result<OrderItem>")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `controller toReadDto includes all normal columns`() {
        val outputDir = createTempDir()
        try {
            generate(baseSql, configJson, outputDir)
            val source = readFile(outputDir, "com/example/order/controller/OrderItemController.kt")

            assertContains(source, "override fun toReadDto(entity: OrderItem): OrderItemDto = OrderItemDto(")
            assertContains(source, "id = entity.id!!")
            assertContains(source, "productName = entity.productName")
            assertContains(source, "quantity = entity.quantity")
            assertContains(source, "price = entity.price")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `Dto includes type-specific imports`() {
        val outputDir = createTempDir()
        try {
            generate(baseSql, configJson, outputDir)
            val source = readFile(outputDir, "com/example/order/dto/OrderItemDto.kt")

            assertContains(source, "import java.math.BigDecimal")
            assertContains(source, "val price: BigDecimal")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `parent and child with different PK types use correct ID types`() {
        val sql =
            """
            CREATE TABLE categories (
              id VARCHAR(36) NOT NULL,
              name VARCHAR(255) NOT NULL,
              version BIGINT NOT NULL,
              deleted BOOLEAN NOT NULL,
              PRIMARY KEY (id)
            );
            CREATE TABLE items (
              id BIGINT NOT NULL AUTO_INCREMENT,
              category_id VARCHAR(36) NOT NULL,
              title VARCHAR(255) NOT NULL,
              created_at TIMESTAMP,
              updated_at TIMESTAMP,
              PRIMARY KEY (id)
            );
            """.trimIndent()

        val config =
            """
            {
              "basePackage": "com.example.catalog",
              "aggregates": [
                {
                  "root": "categories",
                  "idStrategy": "NONE",
                  "relations": [
                    { "type": "OneToMany", "target": "items", "joinColumn": "category_id" }
                  ],
                  "entities": [
                    {
                      "table": "items",
                      "relations": [
                        { "type": "ManyToOne", "target": "categories", "joinColumn": "category_id" }
                      ]
                    }
                  ]
                }
              ]
            }
            """.trimIndent()

        val outputDir = createTempDir()
        try {
            generate(sql, config, outputDir)

            val createForm = readFile(outputDir, "com/example/catalog/form/ItemCreateForm.kt")
            assertContains(createForm, "val categoryId: String")

            val updateForm = readFile(outputDir, "com/example/catalog/form/ItemUpdateForm.kt")
            assertContains(updateForm, "override val id: Long")
            assertContains(updateForm, "val categoryId: String?")

            val resolver = readFile(outputDir, "com/example/catalog/service/ItemFormResolver.kt")
            assertContains(
                resolver,
                "FormResolver1<Long, Item, ItemCreateForm, ItemUpdateForm, String, Category>",
            )
            assertContains(resolver, "override fun ItemCreateForm.parentId(): Result<String>")
            assertContains(resolver, "override fun ItemUpdateForm.parentId(): Result<String?>")

            val repo = readFile(outputDir, "com/example/catalog/repository/CategoryRepository.kt")
            assertContains(repo, "JpaRepository<Category, String>")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `nullable FK generates nullable parent ID in CreateForm and FormResolver`() {
        val sql =
            """
            CREATE TABLE orders (
              id BIGINT NOT NULL AUTO_INCREMENT,
              name VARCHAR(255) NOT NULL,
              version BIGINT NOT NULL,
              deleted BOOLEAN NOT NULL,
              PRIMARY KEY (id)
            );
            CREATE TABLE order_items (
              id BIGINT NOT NULL AUTO_INCREMENT,
              order_id BIGINT NULL,
              name VARCHAR(255) NOT NULL,
              created_at TIMESTAMP,
              updated_at TIMESTAMP,
              PRIMARY KEY (id)
            );
            """.trimIndent()

        val config =
            """
            {
              "basePackage": "com.example.order",
              "aggregates": [
                {
                  "root": "orders",
                  "relations": [
                    { "type": "OneToMany", "target": "order_items", "joinColumn": "order_id" }
                  ],
                  "entities": [
                    {
                      "table": "order_items",
                      "relations": [
                        { "type": "ManyToOne", "target": "orders", "joinColumn": "order_id" }
                      ]
                    }
                  ]
                }
              ]
            }
            """.trimIndent()

        val outputDir = createTempDir()
        try {
            generate(sql, config, outputDir)

            val createForm = readFile(outputDir, "com/example/order/form/OrderItemCreateForm.kt")
            assertContains(createForm, "val orderId: Long?")

            val resolver = readFile(outputDir, "com/example/order/service/OrderItemFormResolver.kt")
            assertContains(resolver, "override fun OrderItemCreateForm.parentId(): Result<Long>")
            assertContains(resolver, "orderId?.let { Result.success(it) }")
            assertContains(resolver, "Result.failure(IllegalArgumentException(\"orderId must not be null\"))")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    private fun generate(
        sql: String,
        config: String,
        outputDir: File,
    ) {
        val schema = parseSchema(sql)
        val aggConfig = configParser.parse(config)
        generator.generate(schema, aggConfig, outputDir)
    }

    private fun readFile(
        outputDir: File,
        path: String,
    ): String = File(outputDir, path).readText()

    private fun parseSchema(sql: String): spring.kraft.entity.gen.TableSchema {
        val dir = createTempDir()
        return try {
            val file = File(dir, "schema.sql")
            file.writeText(sql)
            ddlParser.parse(file)
        } finally {
            dir.deleteRecursively()
        }
    }

    private fun createTempDir(): File {
        val dir = File(System.getProperty("java.io.tmpdir"), "skeleton-gen-test-${System.nanoTime()}")
        dir.mkdirs()
        return dir
    }
}
