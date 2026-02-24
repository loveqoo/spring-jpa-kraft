package spring.kraft.jpa.datasource

import com.zaxxer.hikari.HikariDataSource
import org.springframework.boot.autoconfigure.AutoConfigurations
import org.springframework.boot.test.context.runner.ApplicationContextRunner
import org.springframework.jdbc.datasource.LazyConnectionDataSourceProxy
import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource
import javax.sql.DataSource
import kotlin.test.Test
import kotlin.test.assertFalse
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

class DataSourceRoutingAutoConfigurationTest {
    private val contextRunner =
        ApplicationContextRunner()
            .withConfiguration(AutoConfigurations.of(DataSourceRoutingAutoConfiguration::class.java))

    @Test
    fun `master jdbc-url 설정이 없으면 bean 미등록`() {
        contextRunner.run { context ->
            assertTrue(context.getBeansOfType(DataSource::class.java).isEmpty())
        }
    }

    @Test
    fun `master jdbc-url 설정이 있으면 LazyConnectionDataSourceProxy bean 등록`() {
        contextRunner
            .withPropertyValues(
                "kraft.datasource.master.jdbc-url=jdbc:h2:mem:master",
                "kraft.datasource.master.driver-class-name=org.h2.Driver",
            ).run { context ->
                assertNotNull(context.getBean(DataSource::class.java))
                assertTrue(context.getBean(DataSource::class.java) is LazyConnectionDataSourceProxy)
            }
    }

    @Test
    fun `slave 설정 포함 시에도 정상 등록`() {
        contextRunner
            .withPropertyValues(
                "kraft.datasource.master.jdbc-url=jdbc:h2:mem:master",
                "kraft.datasource.master.driver-class-name=org.h2.Driver",
                "kraft.datasource.slaves[0].jdbc-url=jdbc:h2:mem:slave0",
                "kraft.datasource.slaves[0].driver-class-name=org.h2.Driver",
                "kraft.datasource.slaves[1].jdbc-url=jdbc:h2:mem:slave1",
                "kraft.datasource.slaves[1].driver-class-name=org.h2.Driver",
            ).run { context ->
                assertNotNull(context.getBean(DataSource::class.java))
                assertTrue(context.getBean(DataSource::class.java) is LazyConnectionDataSourceProxy)
            }
    }

    @Test
    fun `컨텍스트 종료 시 HikariDataSource pool이 close 됨`() {
        val pools = mutableListOf<HikariDataSource>()

        contextRunner
            .withPropertyValues(
                "kraft.datasource.master.jdbc-url=jdbc:h2:mem:lifecycle",
                "kraft.datasource.master.driver-class-name=org.h2.Driver",
                "kraft.datasource.slaves[0].jdbc-url=jdbc:h2:mem:lifecycle-slave",
                "kraft.datasource.slaves[0].driver-class-name=org.h2.Driver",
            ).run { context ->
                val proxy = context.getBean(DataSource::class.java) as LazyConnectionDataSourceProxy
                val routing = proxy.targetDataSource as AbstractRoutingDataSource
                val resolvedField = AbstractRoutingDataSource::class.java.getDeclaredField("resolvedDataSources")
                resolvedField.isAccessible = true
                @Suppress("UNCHECKED_CAST")
                val resolved = resolvedField.get(routing) as Map<Any, DataSource>
                resolved.values.filterIsInstance<HikariDataSource>().forEach { pools.add(it) }

                pools.forEach { assertFalse(it.isClosed) }
            }
        // ApplicationContextRunner.run closes the context after the lambda
        pools.forEach { assertTrue(it.isClosed) }
    }
}
