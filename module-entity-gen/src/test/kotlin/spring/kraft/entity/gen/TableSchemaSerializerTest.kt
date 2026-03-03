package spring.kraft.entity.gen

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull
import kotlin.test.assertTrue

class TableSchemaSerializerTest {
    private val serializer = TableSchemaSerializer()

    @Test
    fun `serialize and deserialize round-trip`() {
        val schema =
            TableSchema(
                tables =
                    listOf(
                        TableDef(
                            name = "orders",
                            schema = null,
                            columns =
                                listOf(
                                    TableColumn(
                                        name = "id",
                                        typeName = "bigint",
                                        typeValue = null,
                                        primaryKey = true,
                                        notNull = true,
                                        unique = false,
                                        autoIncrement = true,
                                        defaultValue = null,
                                        note = null,
                                    ),
                                    TableColumn(
                                        name = "name",
                                        typeName = "varchar",
                                        typeValue = 255,
                                        primaryKey = false,
                                        notNull = true,
                                        unique = false,
                                        autoIncrement = false,
                                        defaultValue = null,
                                        note = null,
                                    ),
                                ),
                            indexes = emptyList(),
                        ),
                    ),
            )

        val json = serializer.toJson(schema)
        val deserialized = serializer.fromJson(json)

        assertEquals(1, deserialized.tables.size)
        val table = deserialized.tables[0]
        assertEquals("orders", table.name)
        assertNull(table.schema)
        assertEquals(2, table.columns.size)

        val idCol = table.columns[0]
        assertEquals("id", idCol.name)
        assertEquals("bigint", idCol.typeName)
        assertTrue(idCol.primaryKey)
        assertTrue(idCol.autoIncrement)

        val nameCol = table.columns[1]
        assertEquals("name", nameCol.name)
        assertEquals("varchar", nameCol.typeName)
        assertEquals(255, nameCol.typeValue)
        assertTrue(nameCol.notNull)
    }

    @Test
    fun `serialize produces readable JSON`() {
        val schema =
            TableSchema(
                tables =
                    listOf(
                        TableDef(
                            name = "users",
                            schema = "mydb",
                            columns =
                                listOf(
                                    TableColumn(
                                        name = "id",
                                        typeName = "bigint",
                                        typeValue = null,
                                        primaryKey = true,
                                        notNull = true,
                                        unique = false,
                                        autoIncrement = true,
                                        defaultValue = null,
                                        note = null,
                                    ),
                                ),
                            indexes =
                                listOf(
                                    TableIndex(
                                        name = "idx_users_pk",
                                        columns = listOf("id"),
                                        unique = true,
                                        primaryKey = true,
                                    ),
                                ),
                        ),
                    ),
            )

        val json = serializer.toJson(schema)

        assertTrue(json.contains("\"name\" : \"users\""))
        assertTrue(json.contains("\"schema\" : \"mydb\""))
        assertTrue(json.contains("\"typeName\" : \"bigint\""))
        assertTrue(json.contains("\"idx_users_pk\""))
    }

    @Test
    fun `deserialize from handwritten JSON`() {
        val json =
            """
            {
              "tables": [
                {
                  "name": "products",
                  "schema": null,
                  "columns": [
                    {
                      "name": "id",
                      "typeName": "bigint",
                      "typeValue": null,
                      "primaryKey": true,
                      "notNull": true,
                      "unique": false,
                      "autoIncrement": true,
                      "defaultValue": null,
                      "note": null
                    },
                    {
                      "name": "title",
                      "typeName": "varchar",
                      "typeValue": 100,
                      "primaryKey": false,
                      "notNull": true,
                      "unique": true,
                      "autoIncrement": false,
                      "defaultValue": "'Untitled'",
                      "note": "Product title"
                    }
                  ],
                  "indexes": []
                }
              ]
            }
            """.trimIndent()

        val schema = serializer.fromJson(json)

        assertEquals(1, schema.tables.size)
        val table = schema.tables[0]
        assertEquals("products", table.name)
        assertEquals(2, table.columns.size)

        val titleCol = table.columns[1]
        assertEquals("title", titleCol.name)
        assertEquals(100, titleCol.typeValue)
        assertTrue(titleCol.unique)
        assertEquals("'Untitled'", titleCol.defaultValue)
        assertEquals("Product title", titleCol.note)
    }
}
