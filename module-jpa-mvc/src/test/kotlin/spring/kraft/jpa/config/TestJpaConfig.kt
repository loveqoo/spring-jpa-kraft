package spring.kraft.jpa.config

import org.springframework.boot.test.context.TestConfiguration
import org.springframework.context.annotation.Bean
import org.springframework.data.domain.AuditorAware
import org.springframework.data.jpa.repository.config.EnableJpaAuditing
import java.util.Optional

@TestConfiguration
@EnableJpaAuditing
class TestJpaConfig {
    @Bean
    fun auditorAware(): AuditorAware<String> = AuditorAware { Optional.of("test-user") }
}
