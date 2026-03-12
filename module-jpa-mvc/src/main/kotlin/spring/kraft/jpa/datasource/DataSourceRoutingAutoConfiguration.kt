package spring.kraft.jpa.datasource

import com.zaxxer.hikari.HikariDataSource
import org.springframework.beans.factory.DisposableBean
import org.springframework.boot.autoconfigure.AutoConfiguration
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty
import org.springframework.boot.context.properties.EnableConfigurationProperties
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Primary
import org.springframework.jdbc.datasource.LazyConnectionDataSourceProxy
import javax.sql.DataSource

@AutoConfiguration
@ConditionalOnProperty("kraft.datasource.master.jdbc-url")
@EnableConfigurationProperties(DataSourceRoutingProperties::class)
class DataSourceRoutingAutoConfiguration : DisposableBean {
    private val hikariDataSources = mutableListOf<HikariDataSource>()

    @Bean
    @Primary
    fun dataSource(properties: DataSourceRoutingProperties): DataSource {
        val master = HikariDataSource(properties.master).also { hikariDataSources.add(it) }
        val targetDataSources = mutableMapOf<Any, Any>("master" to master)

        properties.slaves.forEachIndexed { index, config ->
            targetDataSources["slave-$index"] = HikariDataSource(config).also { hikariDataSources.add(it) }
        }

        val routingDataSource = ReadOnlyRoutingDataSource(properties.slaves.size)
        routingDataSource.setTargetDataSources(targetDataSources)
        routingDataSource.setDefaultTargetDataSource(master)
        routingDataSource.afterPropertiesSet()

        return LazyConnectionDataSourceProxy(routingDataSource)
    }

    override fun destroy() {
        hikariDataSources.forEach { it.close() }
    }
}
