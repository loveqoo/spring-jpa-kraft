package spring.kraft.entity.gen

import java.io.File
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertFailsWith
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class DdlParserTest {
    private val parser = DdlParser()

    @Test
    fun `parse single create table`() {
        val sql =
            """
            CREATE TABLE orders (
              id BIGINT NOT NULL AUTO_INCREMENT,
              name VARCHAR(255) NOT NULL UNIQUE,
              status VARCHAR(50) NOT NULL DEFAULT 'PENDING',
              PRIMARY KEY (id),
              KEY idx_status (status)
            );
            """.trimIndent()

        val schema = parse(sql)

        assertEquals(1, schema.tables.size)
        val table = schema.tables.first()
        assertEquals("orders", table.name)
        assertEquals(3, table.columns.size)
        assertEquals(2, table.indexes.size)

        val pkIndex = table.indexes.first { it.primaryKey }
        assertEquals(listOf("id"), pkIndex.columns)
        assertTrue(pkIndex.unique)

        val statusIndex = table.indexes.first { it.name == "idx_status" }
        assertEquals(listOf("status"), statusIndex.columns)
        assertEquals(false, statusIndex.unique)
        assertEquals(false, statusIndex.primaryKey)

        val id = table.columns.first { it.name == "id" }
        assertTrue(id.primaryKey)
        assertTrue(id.notNull)
        assertTrue(id.autoIncrement)

        val status = table.columns.first { it.name == "status" }
        assertEquals("varchar", status.typeName)
        assertEquals(50, status.typeValue)
        assertEquals("PENDING", status.defaultValue)
    }

    @Test
    fun `parse multiple create tables and ignore non create statements`() {
        val sql =
            """
            CREATE TABLE users (
              id BIGINT NOT NULL,
              PRIMARY KEY (id)
            );
            INSERT INTO users(id) VALUES (1);
            CREATE TABLE orders (
              id BIGINT NOT NULL,
              user_id BIGINT NOT NULL,
              PRIMARY KEY (id),
              UNIQUE KEY uq_user (user_id)
            );
            """.trimIndent()

        val schema = parse(sql)

        assertEquals(2, schema.tables.size)
        assertEquals("users", schema.tables[0].name)
        assertEquals("orders", schema.tables[1].name)

        val userUniqueIndex = schema.tables[1].indexes.first { it.name == "uq_user" }
        assertEquals(listOf("user_id"), userUniqueIndex.columns)
        assertTrue(userUniqueIndex.unique)
        assertEquals(false, userUniqueIndex.primaryKey)
    }

    @Test
    fun `table-level primary key marks columns as pk and not null`() {
        val sql =
            """
            CREATE TABLE order_items (
              id BIGINT,
              order_id BIGINT,
              PRIMARY KEY (id)
            );
            """.trimIndent()

        val schema = parse(sql)
        val idCol = schema.tables[0].columns.first { it.name == "id" }

        assertTrue(idCol.primaryKey)
        assertTrue(idCol.notNull)
    }

    @Test
    fun `constraint level unique index is parsed`() {
        val sql =
            """
            CREATE TABLE users (
              id BIGINT,
              email VARCHAR(320),
              CONSTRAINT uq_users_email UNIQUE (email),
              PRIMARY KEY (id)
            );
            """.trimIndent()

        val schema = parse(sql)
        val idx = schema.tables[0].indexes.first { it.unique }

        assertEquals("uq_users_email", idx.name)
        assertEquals(listOf("email"), idx.columns)
    }

    @Test
    fun `composite index column order is preserved`() {
        val sql =
            """
            CREATE TABLE order_items (
              id BIGINT NOT NULL,
              order_id BIGINT NOT NULL,
              product_id BIGINT NOT NULL,
              status VARCHAR(50) NOT NULL,
              PRIMARY KEY (id),
              UNIQUE KEY uq_order_product (order_id, product_id),
              KEY idx_status_order (status, order_id)
            );
            """.trimIndent()

        val schema = parse(sql)
        val table = schema.tables.first()

        val uniqueComposite = table.indexes.first { it.name == "uq_order_product" }
        assertTrue(uniqueComposite.unique)
        assertEquals(listOf("order_id", "product_id"), uniqueComposite.columns)

        val normalComposite = table.indexes.first { it.name == "idx_status_order" }
        assertEquals(false, normalComposite.unique)
        assertEquals(listOf("status", "order_id"), normalComposite.columns)
    }

    @Test
    fun `foreign key constraint is not parsed as column`() {
        val sql =
            """
            CREATE TABLE users (
              id BIGINT NOT NULL,
              PRIMARY KEY (id)
            );
            CREATE TABLE orders (
              id BIGINT NOT NULL,
              user_id BIGINT NOT NULL,
              CONSTRAINT fk_orders_user FOREIGN KEY (user_id) REFERENCES users(id),
              PRIMARY KEY (id)
            );
            """.trimIndent()

        val schema = parse(sql)
        val orders = schema.tables.first { it.name == "orders" }

        assertEquals(listOf("id", "user_id"), orders.columns.map { it.name })
        assertFalse(orders.columns.any { it.name.equals("constraint", ignoreCase = true) })
    }

    @Test
    fun `invalid create table fails fast with context`() {
        val sql =
            """
            CREATE TABLE broken (
              id BIGINT NOT NULL,
              PRIMARY KEY (id)
            """.trimIndent()

        val ex = assertFailsWith<IllegalArgumentException> { parse(sql) }
        val message = ex.message ?: ""
        assertContains(message, "DDL syntax error")
        assertContains(message, ">>>")
    }

    @Test
    fun `drop table and other DDL statements are ignored`() {
        val sql =
            """
            DROP TABLE IF EXISTS `orders`;
            CREATE TABLE orders (
              id BIGINT NOT NULL,
              name VARCHAR(255) NOT NULL,
              PRIMARY KEY (id)
            );
            ALTER TABLE orders ADD INDEX idx_name (name);
            """.trimIndent()

        val schema = parse(sql)

        assertEquals(1, schema.tables.size)
        assertEquals("orders", schema.tables[0].name)
        assertEquals(2, schema.tables[0].columns.size)
    }

    @Test
    fun `multiple create tables without semicolons are parsed`() {
        val sql =
            """
            CREATE TABLE users (
              id BIGINT NOT NULL,
              PRIMARY KEY (id)
            )
            CREATE TABLE orders (
              id BIGINT NOT NULL,
              user_id BIGINT NOT NULL,
              PRIMARY KEY (id)
            )
            """.trimIndent()

        val schema = parse(sql)

        assertEquals(2, schema.tables.size)
        assertEquals("users", schema.tables[0].name)
        assertEquals("orders", schema.tables[1].name)
        assertEquals(2, schema.tables[1].columns.size)
    }

    @Test
    fun `index columns with sort direction are parsed`() {
        val sql =
            """
            CREATE TABLE orders (
              id BIGINT NOT NULL,
              name VARCHAR(255) NOT NULL,
              created_at TIMESTAMP,
              PRIMARY KEY (id),
              KEY idx_name_desc (name DESC),
              KEY idx_created_asc (created_at ASC, name DESC)
            );
            """.trimIndent()

        val schema = parse(sql)
        val table = schema.tables.first()

        val singleIndex = table.indexes.first { it.name == "idx_name_desc" }
        assertEquals(listOf("name"), singleIndex.columns)

        val compositeIndex = table.indexes.first { it.name == "idx_created_asc" }
        assertEquals(listOf("created_at", "name"), compositeIndex.columns)
    }

    @Test
    fun `index with USING option is parsed`() {
        val sql =
            """
            CREATE TABLE orders (
              id BIGINT NOT NULL,
              name VARCHAR(255) NOT NULL,
              PRIMARY KEY (id),
              KEY idx_name (name) USING BTREE
            );
            """.trimIndent()

        val schema = parse(sql)
        val table = schema.tables.first()

        val idx = table.indexes.first { it.name == "idx_name" }
        assertEquals(listOf("name"), idx.columns)
    }

    @Test
    fun `schema qualified table name is parsed`() {
        val sql =
            """
            CREATE TABLE `shop`.`orders` (
              `id` BIGINT NOT NULL,
              PRIMARY KEY (`id`)
            );
            """.trimIndent()

        val schema = parse(sql)
        val table = schema.tables.first()

        assertEquals("shop", table.schema)
        assertEquals("orders", table.name)
    }

    private fun parse(sql: String): TableSchema {
        val tempDir = File(System.getProperty("java.io.tmpdir"), "ddl-parser-${System.nanoTime()}")
        tempDir.mkdirs()
        return try {
            val file = File(tempDir, "schema.sql")
            file.writeText(sql)
            parser.parse(file)
        } finally {
            tempDir.deleteRecursively()
        }
    }
}
