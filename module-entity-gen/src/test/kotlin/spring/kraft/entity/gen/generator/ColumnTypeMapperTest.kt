package spring.kraft.entity.gen.generator

import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

class ColumnTypeMapperTest {
    @Test
    fun `bigint maps to Long`() {
        assertEquals("Long", ColumnTypeMapper.toKotlinType("bigint"))
        assertNull(ColumnTypeMapper.requiredImport("bigint"))
    }

    @Test
    fun `int and integer map to Int`() {
        assertEquals("Int", ColumnTypeMapper.toKotlinType("int"))
        assertEquals("Int", ColumnTypeMapper.toKotlinType("integer"))
    }

    @Test
    fun `smallint maps to Short`() {
        assertEquals("Short", ColumnTypeMapper.toKotlinType("smallint"))
    }

    @Test
    fun `tinyint(1) maps to Boolean, otherwise Byte`() {
        assertEquals("Boolean", ColumnTypeMapper.toKotlinType("tinyint", 1))
        assertEquals("Byte", ColumnTypeMapper.toKotlinType("tinyint"))
        assertEquals("Byte", ColumnTypeMapper.toKotlinType("tinyint", 4))
    }

    @Test
    fun `string types map to String`() {
        assertEquals("String", ColumnTypeMapper.toKotlinType("varchar", 255))
        assertEquals("String", ColumnTypeMapper.toKotlinType("char", 10))
        assertEquals("String", ColumnTypeMapper.toKotlinType("text"))
        assertEquals("String", ColumnTypeMapper.toKotlinType("mediumtext"))
        assertEquals("String", ColumnTypeMapper.toKotlinType("longtext"))
        assertEquals("String", ColumnTypeMapper.toKotlinType("json"))
    }

    @Test
    fun `boolean types map to Boolean`() {
        assertEquals("Boolean", ColumnTypeMapper.toKotlinType("boolean"))
        assertEquals("Boolean", ColumnTypeMapper.toKotlinType("bool"))
    }

    @Test
    fun `timestamp and datetime map to LocalDateTime with import`() {
        assertEquals("LocalDateTime", ColumnTypeMapper.toKotlinType("timestamp"))
        assertEquals("LocalDateTime", ColumnTypeMapper.toKotlinType("datetime"))
        assertEquals("java.time.LocalDateTime", ColumnTypeMapper.requiredImport("timestamp"))
        assertEquals("java.time.LocalDateTime", ColumnTypeMapper.requiredImport("datetime"))
    }

    @Test
    fun `date maps to LocalDate with import`() {
        assertEquals("LocalDate", ColumnTypeMapper.toKotlinType("date"))
        assertEquals("java.time.LocalDate", ColumnTypeMapper.requiredImport("date"))
    }

    @Test
    fun `time maps to LocalTime with import`() {
        assertEquals("LocalTime", ColumnTypeMapper.toKotlinType("time"))
        assertEquals("java.time.LocalTime", ColumnTypeMapper.requiredImport("time"))
    }

    @Test
    fun `decimal and numeric map to BigDecimal with import`() {
        assertEquals("BigDecimal", ColumnTypeMapper.toKotlinType("decimal"))
        assertEquals("BigDecimal", ColumnTypeMapper.toKotlinType("numeric"))
        assertEquals("java.math.BigDecimal", ColumnTypeMapper.requiredImport("decimal"))
    }

    @Test
    fun `float and double map correctly`() {
        assertEquals("Float", ColumnTypeMapper.toKotlinType("float"))
        assertEquals("Double", ColumnTypeMapper.toKotlinType("double"))
        assertNull(ColumnTypeMapper.requiredImport("float"))
    }

    @Test
    fun `binary types map to ByteArray`() {
        assertEquals("ByteArray", ColumnTypeMapper.toKotlinType("binary"))
        assertEquals("ByteArray", ColumnTypeMapper.toKotlinType("varbinary"))
        assertEquals("ByteArray", ColumnTypeMapper.toKotlinType("blob"))
    }

    @Test
    fun `unknown type defaults to String`() {
        assertEquals("String", ColumnTypeMapper.toKotlinType("unknown_type"))
        assertNull(ColumnTypeMapper.requiredImport("unknown_type"))
    }

    @Test
    fun `type names are case insensitive`() {
        assertEquals("Long", ColumnTypeMapper.toKotlinType("BIGINT"))
        assertEquals("Int", ColumnTypeMapper.toKotlinType("INT"))
        assertEquals("LocalDateTime", ColumnTypeMapper.toKotlinType("TIMESTAMP"))
    }
}
