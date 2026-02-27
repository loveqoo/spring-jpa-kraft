package spring.kraft.dbml

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class DbmlJsonParserTest {
    private val parser = DbmlJsonParser()

    @Test
    fun `parse single table with columns`() {
        val json =
            """
            {
              "schemas": [{
                "tables": [{
                  "name": "orders",
                  "fields": [
                    { "name": "id", "type": { "type_name": "bigint" }, "pk": true, "not_null": true },
                    { "name": "name", "type": { "type_name": "varchar", "value": 255 }, "not_null": true }
                  ],
                  "indexes": []
                }]
              }]
            }
            """.trimIndent()

        val schema = parser.parse(json)

        assertEquals(1, schema.tables.size)
        val table = schema.tables[0]
        assertEquals("orders", table.name)
        assertEquals(2, table.columns.size)
        assertEquals("id", table.columns[0].name)
        assertEquals("name", table.columns[1].name)
    }

    @Test
    fun `parse column type with value`() {
        val json =
            """
            {
              "schemas": [{
                "tables": [{
                  "name": "users",
                  "fields": [
                    { "name": "email", "type": { "type_name": "varchar", "value": 320 } }
                  ],
                  "indexes": []
                }]
              }]
            }
            """.trimIndent()

        val column = parser.parse(json).tables[0].columns[0]

        assertEquals("varchar", column.typeName)
        assertEquals(320, column.typeValue)
    }

    @Test
    fun `parse column constraints`() {
        val json =
            """
            {
              "schemas": [{
                "tables": [{
                  "name": "items",
                  "fields": [
                    {
                      "name": "id", "type": { "type_name": "bigint" },
                      "pk": true, "not_null": true, "unique": false, "increment": true
                    },
                    {
                      "name": "code", "type": { "type_name": "varchar", "value": 50 },
                      "pk": false, "not_null": true, "unique": true, "increment": false
                    }
                  ],
                  "indexes": []
                }]
              }]
            }
            """.trimIndent()

        val columns = parser.parse(json).tables[0].columns
        val id = columns[0]
        val code = columns[1]

        assertTrue(id.primaryKey)
        assertTrue(id.notNull)
        assertTrue(id.autoIncrement)

        assertTrue(code.notNull)
        assertTrue(code.unique)
        assertEquals(false, code.primaryKey)
        assertEquals(false, code.autoIncrement)
    }

    @Test
    fun `parse default values`() {
        val json =
            """
            {
              "schemas": [{
                "tables": [{
                  "name": "products",
                  "fields": [
                    {
                      "name": "status", "type": { "type_name": "varchar", "value": 50 },
                      "dbdefault": { "value": "PENDING", "type": "string" }
                    },
                    {
                      "name": "quantity", "type": { "type_name": "int" },
                      "dbdefault": { "value": 0, "type": "number" }
                    },
                    {
                      "name": "created_at", "type": { "type_name": "timestamp" },
                      "dbdefault": { "value": "CURRENT_TIMESTAMP", "type": "expression" }
                    }
                  ],
                  "indexes": []
                }]
              }]
            }
            """.trimIndent()

        val columns = parser.parse(json).tables[0].columns

        assertEquals("PENDING", columns[0].defaultValue)
        assertEquals("0", columns[1].defaultValue)
        assertEquals("CURRENT_TIMESTAMP", columns[2].defaultValue)
    }

    @Test
    fun `parse indexes`() {
        val json =
            """
            {
              "schemas": [{
                "tables": [{
                  "name": "orders",
                  "fields": [
                    { "name": "id", "type": { "type_name": "bigint" }, "pk": true },
                    { "name": "status", "type": { "type_name": "varchar", "value": 50 } },
                    { "name": "user_id", "type": { "type_name": "bigint" } }
                  ],
                  "indexes": [
                    {
                      "name": "idx_status",
                      "unique": false,
                      "pk": false,
                      "columns": [{ "type": "column", "value": "status" }]
                    },
                    {
                      "name": "uq_user_status",
                      "unique": true,
                      "pk": false,
                      "columns": [
                        { "type": "column", "value": "user_id" },
                        { "type": "column", "value": "status" }
                      ]
                    }
                  ]
                }]
              }]
            }
            """.trimIndent()

        val indexes = parser.parse(json).tables[0].indexes

        assertEquals(2, indexes.size)

        val idx = indexes[0]
        assertEquals("idx_status", idx.name)
        assertEquals(false, idx.unique)
        assertEquals(listOf("status"), idx.columns)

        val uq = indexes[1]
        assertEquals("uq_user_status", uq.name)
        assertTrue(uq.unique)
        assertEquals(listOf("user_id", "status"), uq.columns)
    }

    @Test
    fun `parse multiple tables`() {
        val json =
            """
            {
              "schemas": [{
                "tables": [
                  {
                    "name": "orders",
                    "fields": [{ "name": "id", "type": { "type_name": "bigint" }, "pk": true }],
                    "indexes": []
                  },
                  {
                    "name": "order_items",
                    "fields": [{ "name": "id", "type": { "type_name": "bigint" }, "pk": true }],
                    "indexes": []
                  }
                ]
              }]
            }
            """.trimIndent()

        val tables = parser.parse(json).tables

        assertEquals(2, tables.size)
        assertEquals("orders", tables[0].name)
        assertEquals("order_items", tables[1].name)
    }

    @Test
    fun `ignore refs`() {
        val json =
            """
            {
              "schemas": [{
                "tables": [{
                  "name": "orders",
                  "fields": [{ "name": "id", "type": { "type_name": "bigint" }, "pk": true }],
                  "indexes": []
                }]
              }],
              "refs": [
                {
                  "name": "fk_orders_users",
                  "endpoints": [
                    { "tableName": "orders", "fieldNames": ["user_id"], "relation": ">" },
                    { "tableName": "users", "fieldNames": ["id"], "relation": "1" }
                  ]
                }
              ]
            }
            """.trimIndent()

        val schema = parser.parse(json)

        assertEquals(1, schema.tables.size)
        assertEquals("orders", schema.tables[0].name)
    }

    @Test
    fun `parse empty schema`() {
        val json =
            """
            {
              "schemas": [{
                "tables": []
              }]
            }
            """.trimIndent()

        val schema = parser.parse(json)

        assertTrue(schema.tables.isEmpty())
    }

    @Test
    fun `pk implies not null`() {
        val json =
            """
            {
              "schemas": [{
                "tables": [{
                  "name": "test",
                  "fields": [
                    { "name": "id", "type": { "type_name": "bigint" }, "pk": true, "not_null": false }
                  ],
                  "indexes": []
                }]
              }]
            }
            """.trimIndent()

        val column = parser.parse(json).tables[0].columns[0]

        assertTrue(column.primaryKey)
        assertTrue(column.notNull, "pk=true should imply notNull=true even when not_null=false in JSON")
    }

    @Test
    fun `parse column note`() {
        val json =
            """
            {
              "schemas": [{
                "tables": [{
                  "name": "test",
                  "fields": [
                    {
                      "name": "status", "type": { "type_name": "varchar", "value": 50 },
                      "note": { "value": "Order status: PENDING, CONFIRMED, SHIPPED" }
                    }
                  ],
                  "indexes": []
                }]
              }]
            }
            """.trimIndent()

        val column = parser.parse(json).tables[0].columns[0]

        assertEquals("Order status: PENDING, CONFIRMED, SHIPPED", column.note)
    }
}
