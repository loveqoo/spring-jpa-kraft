package spring.kraft.jpa.datasource

import org.springframework.transaction.support.TransactionSynchronizationManager
import kotlin.test.AfterTest
import kotlin.test.Test
import kotlin.test.assertEquals

class ReadOnlyRoutingDataSourceTest {
    private class TestableRoutingDataSource(
        slaveCount: Int,
    ) : ReadOnlyRoutingDataSource(slaveCount) {
        public override fun determineCurrentLookupKey(): String = super.determineCurrentLookupKey()

        fun setCounter(value: Int) {
            counter.set(value)
        }
    }

    @AfterTest
    fun cleanup() {
        TransactionSynchronizationManager.setCurrentTransactionReadOnly(false)
    }

    @Test
    fun `readOnly가 false이면 master 반환`() {
        val ds = TestableRoutingDataSource(slaveCount = 2)

        TransactionSynchronizationManager.setCurrentTransactionReadOnly(false)

        assertEquals("master", ds.determineCurrentLookupKey())
    }

    @Test
    fun `readOnly가 true이고 slave가 있으면 slave 반환`() {
        val ds = TestableRoutingDataSource(slaveCount = 2)

        TransactionSynchronizationManager.setCurrentTransactionReadOnly(true)

        assertEquals("slave-0", ds.determineCurrentLookupKey())
    }

    @Test
    fun `readOnly가 true이지만 slave가 없으면 master 반환`() {
        val ds = TestableRoutingDataSource(slaveCount = 0)

        TransactionSynchronizationManager.setCurrentTransactionReadOnly(true)

        assertEquals("master", ds.determineCurrentLookupKey())
    }

    @Test
    fun `slave가 여러 대면 round-robin으로 순환`() {
        val ds = TestableRoutingDataSource(slaveCount = 3)

        TransactionSynchronizationManager.setCurrentTransactionReadOnly(true)

        assertEquals("slave-0", ds.determineCurrentLookupKey())
        assertEquals("slave-1", ds.determineCurrentLookupKey())
        assertEquals("slave-2", ds.determineCurrentLookupKey())
        assertEquals("slave-0", ds.determineCurrentLookupKey())
    }

    @Test
    fun `카운터 오버플로우 시에도 음수 인덱스 없이 정상 라우팅`() {
        val ds = TestableRoutingDataSource(slaveCount = 3)
        ds.setCounter(Int.MAX_VALUE - 1)

        TransactionSynchronizationManager.setCurrentTransactionReadOnly(true)

        assertEquals("slave-${Math.floorMod(Int.MAX_VALUE - 1, 3)}", ds.determineCurrentLookupKey())
        assertEquals("slave-${Math.floorMod(Int.MAX_VALUE, 3)}", ds.determineCurrentLookupKey())
        // Int.MAX_VALUE + 1 → Int.MIN_VALUE (overflow)
        assertEquals("slave-${Math.floorMod(Int.MIN_VALUE, 3)}", ds.determineCurrentLookupKey())
        assertEquals("slave-${Math.floorMod(Int.MIN_VALUE + 1, 3)}", ds.determineCurrentLookupKey())
    }
}
