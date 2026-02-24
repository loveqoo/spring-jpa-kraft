package spring.kraft.jpa.datasource

import org.springframework.jdbc.datasource.lookup.AbstractRoutingDataSource
import org.springframework.transaction.support.TransactionSynchronizationManager
import java.util.concurrent.atomic.AtomicInteger

open class ReadOnlyRoutingDataSource(
    private val slaveCount: Int,
) : AbstractRoutingDataSource() {
    protected val counter = AtomicInteger(0)

    override fun determineCurrentLookupKey(): String =
        if (TransactionSynchronizationManager.isCurrentTransactionReadOnly() && slaveCount > 0) {
            "slave-${Math.floorMod(counter.getAndIncrement(), slaveCount)}"
        } else {
            "master"
        }
}
