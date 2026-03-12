package spring.kraft.entity.gen.config

import spring.kraft.entity.gen.TableSchema
import tools.jackson.module.kotlin.jacksonObjectMapper
import tools.jackson.module.kotlin.readValue

class AggregateConfigParser {
    private val mapper = jacksonObjectMapper()

    fun parse(json: String): AggregateConfig = mapper.readValue<AggregateConfig>(json)

    fun parseWithSchema(json: String): Pair<AggregateConfig, TableSchema> {
        val config = parse(json)
        val schema =
            requireNotNull(config.tableSchema) {
                "Config JSON does not contain 'tableSchema'. Provide a DDL file or use the full config JSON from the designer."
            }
        return config to schema
    }
}
