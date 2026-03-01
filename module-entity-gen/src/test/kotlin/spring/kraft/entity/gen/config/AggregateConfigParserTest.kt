package spring.kraft.entity.gen.config

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertTrue

class AggregateConfigParserTest {
    private val parser = AggregateConfigParser()

    @Test
    fun `parse config with single aggregate`() {
        val json =
            """
            {
              "basePackage": "com.example.order",
              "aggregates": [
                {
                  "root": "orders",
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

        val config = parser.parse(json)

        assertEquals("com.example.order", config.basePackage)
        assertEquals(1, config.aggregates.size)

        val agg = config.aggregates[0]
        assertEquals("orders", agg.root)
        assertEquals(1, agg.entities.size)

        val entity = agg.entities[0]
        assertEquals("order_items", entity.table)
        assertEquals(1, entity.relations.size)

        val rel = entity.relations[0]
        assertEquals(RelationType.ManyToOne, rel.type)
        assertEquals("orders", rel.target)
        assertEquals("order_id", rel.joinColumn)
    }

    @Test
    fun `parse config with multiple entities and relations`() {
        val json =
            """
            {
              "basePackage": "com.example.order",
              "aggregates": [
                {
                  "root": "orders",
                  "entities": [
                    {
                      "table": "order_items",
                      "relations": [
                        { "type": "ManyToOne", "target": "orders", "joinColumn": "order_id" }
                      ]
                    },
                    {
                      "table": "order_logs",
                      "relations": [
                        { "type": "ManyToOne", "target": "orders", "joinColumn": "order_id" }
                      ]
                    }
                  ]
                }
              ]
            }
            """.trimIndent()

        val config = parser.parse(json)

        assertEquals(2, config.aggregates[0].entities.size)
        assertEquals("order_items", config.aggregates[0].entities[0].table)
        assertEquals("order_logs", config.aggregates[0].entities[1].table)
    }

    @Test
    fun `parse config with no aggregates`() {
        val json =
            """
            {
              "basePackage": "com.example.standalone"
            }
            """.trimIndent()

        val config = parser.parse(json)

        assertEquals("com.example.standalone", config.basePackage)
        assertTrue(config.aggregates.isEmpty())
    }

    @Test
    fun `parse config with OneToOne relation`() {
        val json =
            """
            {
              "basePackage": "com.example.user",
              "aggregates": [
                {
                  "root": "users",
                  "entities": [
                    {
                      "table": "user_profiles",
                      "relations": [
                        { "type": "OneToOne", "target": "users", "joinColumn": "user_id" }
                      ]
                    }
                  ]
                }
              ]
            }
            """.trimIndent()

        val config = parser.parse(json)

        val rel = config.aggregates[0].entities[0].relations[0]
        assertEquals(RelationType.OneToOne, rel.type)
    }

    @Test
    fun `parse config with multiple aggregates`() {
        val json =
            """
            {
              "basePackage": "com.example",
              "aggregates": [
                {
                  "root": "orders",
                  "entities": []
                },
                {
                  "root": "products",
                  "entities": []
                }
              ]
            }
            """.trimIndent()

        val config = parser.parse(json)

        assertEquals(2, config.aggregates.size)
        assertEquals("orders", config.aggregates[0].root)
        assertEquals("products", config.aggregates[1].root)
    }

    @Test
    fun `parse aggregate level relations`() {
        val json =
            """
            {
              "basePackage": "com.example",
              "aggregates": [
                {
                  "root": "orders",
                  "relations": [
                    { "type": "OneToMany", "target": "order_items", "joinColumn": "order_id" }
                  ],
                  "entities": []
                }
              ]
            }
            """.trimIndent()

        val config = parser.parse(json)

        assertEquals(1, config.aggregates[0].relations.size)
        assertEquals(RelationType.OneToMany, config.aggregates[0].relations[0].type)
    }
}
