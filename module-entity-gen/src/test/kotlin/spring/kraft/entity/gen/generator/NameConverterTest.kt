package spring.kraft.entity.gen.generator

import kotlin.test.Test
import kotlin.test.assertEquals

class NameConverterTest {
    @Test
    fun `toClassName converts snake_case table name to singular PascalCase`() {
        assertEquals("Order", NameConverter.toClassName("orders"))
        assertEquals("OrderItem", NameConverter.toClassName("order_items"))
        assertEquals("OrderLog", NameConverter.toClassName("order_logs"))
        assertEquals("User", NameConverter.toClassName("users"))
    }

    @Test
    fun `toClassName preserves words ending with ss, us, is`() {
        assertEquals("Address", NameConverter.toClassName("address"))
        assertEquals("Status", NameConverter.toClassName("status"))
        assertEquals("Analysis", NameConverter.toClassName("analysis"))
    }

    @Test
    fun `toClassName handles ies plural`() {
        assertEquals("Category", NameConverter.toClassName("categories"))
        assertEquals("Company", NameConverter.toClassName("companies"))
    }

    @Test
    fun `toClassName handles es plural`() {
        assertEquals("Box", NameConverter.toClassName("boxes"))
        assertEquals("Match", NameConverter.toClassName("matches"))
        assertEquals("Bush", NameConverter.toClassName("bushes"))
    }

    @Test
    fun `toPropertyName converts snake_case column to camelCase`() {
        assertEquals("orderId", NameConverter.toPropertyName("order_id"))
        assertEquals("createdAt", NameConverter.toPropertyName("created_at"))
        assertEquals("name", NameConverter.toPropertyName("name"))
    }

    @Test
    fun `toPascalCase converts snake_case to PascalCase`() {
        assertEquals("OrderItems", NameConverter.toPascalCase("order_items"))
        assertEquals("Id", NameConverter.toPascalCase("id"))
        assertEquals("CreatedAt", NameConverter.toPascalCase("created_at"))
    }

    @Test
    fun `toCamelCase converts snake_case to camelCase`() {
        assertEquals("orderItems", NameConverter.toCamelCase("order_items"))
        assertEquals("id", NameConverter.toCamelCase("id"))
        assertEquals("createdAt", NameConverter.toCamelCase("created_at"))
    }

    @Test
    fun `toClassName handles single word without plural`() {
        assertEquals("Item", NameConverter.toClassName("item"))
        assertEquals("Log", NameConverter.toClassName("log"))
    }
}
