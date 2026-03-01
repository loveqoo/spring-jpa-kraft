package spring.kraft.entity.gen.config

import tools.jackson.module.kotlin.jacksonObjectMapper
import tools.jackson.module.kotlin.readValue

class AggregateConfigParser {
    private val mapper = jacksonObjectMapper()

    fun parse(json: String): AggregateConfig = mapper.readValue<AggregateConfig>(json)
}
