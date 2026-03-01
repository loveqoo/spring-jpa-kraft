package spring.kraft.ddl.generator

import spring.kraft.ddl.TableColumn
import spring.kraft.ddl.TableDef
import spring.kraft.ddl.TableIndex
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertFalse
import kotlin.test.assertTrue

class ColumnClassifierTest {
    private fun column(
        name: String,
        typeName: String = "varchar",
        primaryKey: Boolean = false,
        unique: Boolean = false,
    ) = TableColumn(
        name = name,
        typeName = typeName,
        typeValue = null,
        primaryKey = primaryKey,
        notNull = true,
        unique = unique,
        autoIncrement = false,
        defaultValue = null,
        note = null,
    )

    private fun table(
        name: String,
        columns: List<TableColumn>,
        indexes: List<TableIndex> = emptyList(),
    ) = TableDef(name = name, schema = null, columns = columns, indexes = indexes)

    @Test
    fun `primary key column is classified as PK`() {
        val t = table("orders", listOf(column("id", primaryKey = true), column("name")))
        val result = ColumnClassifier.classify(t, isAggregateRoot = false, joinColumns = emptySet())

        assertEquals(ColumnRole.PK, result[0].role)
        assertEquals(ColumnRole.NORMAL, result[1].role)
    }

    @Test
    fun `base entity audit columns are SKIP`() {
        val cols =
            listOf(
                column("id", primaryKey = true),
                column("name"),
                column("created_at"),
                column("created_by"),
                column("updated_at"),
                column("updated_by"),
            )
        val t = table("users", cols)
        val result = ColumnClassifier.classify(t, isAggregateRoot = false, joinColumns = emptySet())

        assertEquals(ColumnRole.SKIP, result.first { it.column.name == "created_at" }.role)
        assertEquals(ColumnRole.SKIP, result.first { it.column.name == "created_by" }.role)
        assertEquals(ColumnRole.SKIP, result.first { it.column.name == "updated_at" }.role)
        assertEquals(ColumnRole.SKIP, result.first { it.column.name == "updated_by" }.role)
    }

    @Test
    fun `aggregate root also skips version and deleted`() {
        val cols =
            listOf(
                column("id", primaryKey = true),
                column("name"),
                column("version"),
                column("deleted"),
                column("created_at"),
            )
        val t = table("orders", cols)
        val result = ColumnClassifier.classify(t, isAggregateRoot = true, joinColumns = emptySet())

        assertEquals(ColumnRole.SKIP, result.first { it.column.name == "version" }.role)
        assertEquals(ColumnRole.SKIP, result.first { it.column.name == "deleted" }.role)
    }

    @Test
    fun `non-root does not skip version and deleted`() {
        val cols =
            listOf(
                column("id", primaryKey = true),
                column("version"),
                column("deleted"),
            )
        val t = table("items", cols)
        val result = ColumnClassifier.classify(t, isAggregateRoot = false, joinColumns = emptySet())

        assertEquals(ColumnRole.NORMAL, result.first { it.column.name == "version" }.role)
        assertEquals(ColumnRole.NORMAL, result.first { it.column.name == "deleted" }.role)
    }

    @Test
    fun `join columns are classified as JOIN_COLUMN`() {
        val cols =
            listOf(
                column("id", primaryKey = true),
                column("order_id"),
                column("name"),
            )
        val t = table("order_items", cols)
        val result = ColumnClassifier.classify(t, isAggregateRoot = false, joinColumns = setOf("order_id"))

        assertEquals(ColumnRole.JOIN_COLUMN, result.first { it.column.name == "order_id" }.role)
    }

    @Test
    fun `unique column is identity column`() {
        val cols =
            listOf(
                column("id", primaryKey = true),
                column("code", unique = true),
                column("name"),
            )
        val t = table("products", cols)
        val result = ColumnClassifier.classify(t, isAggregateRoot = false, joinColumns = emptySet())

        assertTrue(result.first { it.column.name == "code" }.isIdentityColumn)
        assertFalse(result.first { it.column.name == "name" }.isIdentityColumn)
    }

    @Test
    fun `single column unique index marks identity column`() {
        val cols =
            listOf(
                column("id", primaryKey = true),
                column("email"),
                column("name"),
            )
        val indexes =
            listOf(
                TableIndex(name = "uq_email", columns = listOf("email"), unique = true, primaryKey = false),
            )
        val t = table("users", cols, indexes)
        val result = ColumnClassifier.classify(t, isAggregateRoot = false, joinColumns = emptySet())

        assertTrue(result.first { it.column.name == "email" }.isIdentityColumn)
        assertFalse(result.first { it.column.name == "name" }.isIdentityColumn)
    }

    @Test
    fun `multi column unique index does not mark identity column`() {
        val cols =
            listOf(
                column("id", primaryKey = true),
                column("user_id"),
                column("status"),
            )
        val indexes =
            listOf(
                TableIndex(
                    name = "uq_user_status",
                    columns = listOf("user_id", "status"),
                    unique = true,
                    primaryKey = false,
                ),
            )
        val t = table("orders", cols, indexes)
        val result = ColumnClassifier.classify(t, isAggregateRoot = false, joinColumns = emptySet())

        assertFalse(result.first { it.column.name == "user_id" }.isIdentityColumn)
        assertFalse(result.first { it.column.name == "status" }.isIdentityColumn)
    }

    @Test
    fun `PK column is not identity column`() {
        val t = table("orders", listOf(column("id", primaryKey = true, unique = true)))
        val result = ColumnClassifier.classify(t, isAggregateRoot = false, joinColumns = emptySet())

        assertFalse(result[0].isIdentityColumn)
    }
}
