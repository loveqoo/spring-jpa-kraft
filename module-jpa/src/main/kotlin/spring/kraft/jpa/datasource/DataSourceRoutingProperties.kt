package spring.kraft.jpa.datasource

import com.zaxxer.hikari.HikariConfig
import org.springframework.boot.context.properties.ConfigurationProperties

@ConfigurationProperties("kraft.datasource")
class DataSourceRoutingProperties {
    var master: HikariConfig = HikariConfig()
    var slaves: List<HikariConfig> = emptyList()
}
