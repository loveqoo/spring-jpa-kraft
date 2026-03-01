package spring.kraft.ddl.generator

import spring.kraft.ddl.DdlParser
import spring.kraft.ddl.config.AggregateConfigParser
import java.io.File
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class EntityGeneratorTest {
    private val ddlParser = DdlParser()
    private val configParser = AggregateConfigParser()
    private val generator = EntityGenerator()

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
    fun `generate creates entity files in correct directory`() {
        val schema = parseSchema(baseSql)
        val config = configParser.parse(configJson)
        val outputDir = createTempDir()

        try {
            generator.generate(schema, config, outputDir)

            val entityDir = File(outputDir, "com/example/order/entity")
            assertTrue(entityDir.exists())
            assertTrue(File(entityDir, "Order.kt").exists())
            assertTrue(File(entityDir, "OrderItem.kt").exists())
            assertTrue(File(entityDir, "Product.kt").exists())
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `aggregate root entity is generated correctly`() {
        val schema = parseSchema(baseSql)
        val config = configParser.parse(configJson)
        val outputDir = createTempDir()

        try {
            generator.generate(schema, config, outputDir)
            val source = File(outputDir, "com/example/order/entity/Order.kt").readText()

            assertContains(source, "import spring.kraft.jpa.AggregateRootBaseEntity")
            assertContains(source, ": AggregateRootBaseEntity<Long, Order>()")
            assertContains(source, "@get:IdentityColumn")
            assertContains(source, "val name: String")
            assertContains(source, "val status: String")
            assertContains(source, "@OneToMany(mappedBy = \"order\"")
            assertContains(source, "val orderItems: MutableList<OrderItem>")
            assertFalse(source.contains("val version"))
            assertFalse(source.contains("val deleted"))
            assertFalse(source.contains("val createdAt"))
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `child entity with ManyToOne is generated correctly`() {
        val schema = parseSchema(baseSql)
        val config = configParser.parse(configJson)
        val outputDir = createTempDir()

        try {
            generator.generate(schema, config, outputDir)
            val source = File(outputDir, "com/example/order/entity/OrderItem.kt").readText()

            assertContains(source, ": BaseEntity<Long>()")
            assertContains(source, "@ManyToOne(fetch = FetchType.LAZY)")
            assertContains(source, "@JoinColumn(name = \"order_id\", nullable = false)")
            assertContains(source, "val order: Order")
            assertContains(source, "val price: BigDecimal")
            assertFalse(source.contains("val orderId"))
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `standalone entity is BaseEntity without relations`() {
        val schema = parseSchema(baseSql)
        val config = configParser.parse(configJson)
        val outputDir = createTempDir()

        try {
            generator.generate(schema, config, outputDir)
            val source = File(outputDir, "com/example/order/entity/Product.kt").readText()

            assertContains(source, ": BaseEntity<Long>()")
            assertContains(source, "@get:IdentityColumn")
            assertFalse(source.contains("ManyToOne"))
            assertFalse(source.contains("OneToMany"))
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `nullable join column generates nullable relation type`() {
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
              PRIMARY KEY (id)
            );
            """.trimIndent()

        val config = configParser.parse(configJson)
        val outputDir = createTempDir()

        try {
            generator.generate(parseSchema(sql), config, outputDir)
            val source = File(outputDir, "com/example/order/entity/OrderItem.kt").readText()

            assertContains(source, "@JoinColumn(name = \"order_id\", nullable = true)")
            assertContains(source, "val order: Order?")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `invalid target table fails with clear error`() {
        val invalidConfig =
            """
            {
              "basePackage": "com.example",
              "aggregates": [{
                "root": "orders",
                "entities": [{
                  "table": "order_items",
                  "relations": [
                    { "type": "ManyToOne", "target": "nonexistent", "joinColumn": "order_id" }
                  ]
                }]
              }]
            }
            """.trimIndent()

        val outputDir = createTempDir()
        try {
            val ex =
                assertFailsWith<IllegalArgumentException> {
                    generator.generate(parseSchema(baseSql), configParser.parse(invalidConfig), outputDir)
                }
            assertContains(ex.message!!, "nonexistent")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `invalid join column fails with clear error`() {
        val invalidConfig =
            """
            {
              "basePackage": "com.example",
              "aggregates": [{
                "root": "orders",
                "entities": [{
                  "table": "order_items",
                  "relations": [
                    { "type": "ManyToOne", "target": "orders", "joinColumn": "nonexistent_id" }
                  ]
                }]
              }]
            }
            """.trimIndent()

        val outputDir = createTempDir()
        try {
            val ex =
                assertFailsWith<IllegalArgumentException> {
                    generator.generate(parseSchema(baseSql), configParser.parse(invalidConfig), outputDir)
                }
            assertContains(ex.message!!, "nonexistent_id")
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `unidirectional OneToMany generates JoinColumn instead of mappedBy`() {
        val unidirectionalConfig =
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
                      "relations": []
                    }
                  ]
                }
              ]
            }
            """.trimIndent()

        val outputDir = createTempDir()
        try {
            generator.generate(parseSchema(baseSql), configParser.parse(unidirectionalConfig), outputDir)

            val orderSource = File(outputDir, "com/example/order/entity/Order.kt").readText()
            assertContains(orderSource, "@OneToMany(cascade = [CascadeType.ALL], orphanRemoval = true)")
            assertContains(orderSource, "@JoinColumn(name = \"order_id\")")
            assertFalse(orderSource.contains("mappedBy"))

            val itemSource = File(outputDir, "com/example/order/entity/OrderItem.kt").readText()
            assertFalse(itemSource.contains("ManyToOne"))
            assertFalse(itemSource.contains("val order:"))
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `idStrategy from config is applied to generated entity`() {
        val sql =
            """
            CREATE TABLE orders (
              id BIGINT NOT NULL,
              name VARCHAR(255) NOT NULL,
              PRIMARY KEY (id)
            );
            """.trimIndent()

        val uuidConfig =
            """
            {
              "basePackage": "com.example.order",
              "idStrategy": "UUID",
              "aggregates": [
                {
                  "root": "orders"
                }
              ]
            }
            """.trimIndent()

        val outputDir = createTempDir()
        try {
            generator.generate(parseSchema(sql), configParser.parse(uuidConfig), outputDir)
            val source = File(outputDir, "com/example/order/entity/Order.kt").readText()

            assertContains(source, "@GeneratedValue(strategy = GenerationType.UUID)")
            assertFalse(source.contains("GenerationType.IDENTITY"))
        } finally {
            outputDir.deleteRecursively()
        }
    }

    @Test
    fun `entity-level idStrategy overrides aggregate and global`() {
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
              id BIGINT NOT NULL,
              order_id BIGINT NOT NULL,
              name VARCHAR(255) NOT NULL,
              PRIMARY KEY (id)
            );
            """.trimIndent()

        val mixedConfig =
            """
            {
              "basePackage": "com.example.order",
              "idStrategy": "IDENTITY",
              "aggregates": [
                {
                  "root": "orders",
                  "idStrategy": "SEQUENCE",
                  "relations": [
                    { "type": "OneToMany", "target": "order_items", "joinColumn": "order_id" }
                  ],
                  "entities": [
                    {
                      "table": "order_items",
                      "idStrategy": "NONE"
                    }
                  ]
                }
              ]
            }
            """.trimIndent()

        val outputDir = createTempDir()
        try {
            generator.generate(parseSchema(sql), configParser.parse(mixedConfig), outputDir)

            val orderSource = File(outputDir, "com/example/order/entity/Order.kt").readText()
            assertContains(orderSource, "GenerationType.SEQUENCE")

            val itemSource = File(outputDir, "com/example/order/entity/OrderItem.kt").readText()
            assertContains(itemSource, "@Id")
            assertFalse(itemSource.contains("@GeneratedValue"))
        } finally {
            outputDir.deleteRecursively()
        }
    }

    private fun parseSchema(sql: String): spring.kraft.ddl.TableSchema {
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
        val dir = File(System.getProperty("java.io.tmpdir"), "entity-gen-test-${System.nanoTime()}")
        dir.mkdirs()
        return dir
    }
}
