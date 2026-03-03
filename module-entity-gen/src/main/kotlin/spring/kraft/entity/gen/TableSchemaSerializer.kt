package spring.kraft.entity.gen

import tools.jackson.module.kotlin.jacksonObjectMapper

class TableSchemaSerializer {
    private val mapper = jacksonObjectMapper()

    fun toJson(schema: TableSchema): String =
        mapper.writerWithDefaultPrettyPrinter().writeValueAsString(schema)

    fun fromJson(json: String): TableSchema =
        mapper.readValue(json, TableSchema::class.java)
}
