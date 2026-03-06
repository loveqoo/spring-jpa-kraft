package spring.kraft.jpa.search

import org.springframework.beans.factory.annotation.Autowired
import org.springframework.boot.data.jpa.test.autoconfigure.DataJpaTest
import org.springframework.data.domain.Sort
import spring.kraft.jpa.search.fixture.SearchTestEntity
import spring.kraft.jpa.search.fixture.SearchTestEntityRepository
import java.math.BigDecimal
import java.time.LocalDateTime
import kotlin.test.BeforeTest
import kotlin.test.Test
import kotlin.test.assertEquals
import kotlin.test.assertNull

@DataJpaTest
class SearchSpecBuilderTest {
    @Autowired
    lateinit var repo: SearchTestEntityRepository

    @BeforeTest
    fun setUp() {
        repo.saveAll(
            listOf(
                SearchTestEntity(
                    name = "Alice",
                    status = "ACTIVE",
                    amount = BigDecimal("100.00"),
                    count = 5,
                    createdAt = LocalDateTime.of(2025, 1, 1, 0, 0),
                ),
                SearchTestEntity(
                    name = "Bob",
                    status = "ACTIVE",
                    amount = BigDecimal("200.00"),
                    count = 10,
                    createdAt = LocalDateTime.of(2025, 6, 1, 0, 0),
                ),
                SearchTestEntity(
                    name = "Charlie",
                    status = "INACTIVE",
                    amount = BigDecimal("300.00"),
                    count = 15,
                    createdAt = LocalDateTime.of(2025, 12, 1, 0, 0),
                ),
            ),
        )
    }

    private val unboundProvider =
        object : SearchFieldProvider<SearchTestEntity> {
            override fun customize(binder: SearchBinder<SearchTestEntity>) {
                binder.allowUnboundFields()
            }
        }

    private val emptyProvider =
        object : SearchFieldProvider<SearchTestEntity> {}

    @Test
    fun `EQ 단일값 검색 - allowUnbound`() {
        val spec = SearchSpecBuilder.build(mapOf("name" to listOf("Alice")), unboundProvider)!!
        val result = repo.findAll(spec)
        assertEquals(1, result.size)
        assertEquals("Alice", result[0].name)
    }

    @Test
    fun `EQ 복수값 IN 자동 전환`() {
        val spec = SearchSpecBuilder.build(mapOf("name" to listOf("Alice", "Bob")), unboundProvider)!!
        val result = repo.findAll(spec)
        assertEquals(2, result.size)
    }

    @Test
    fun `EQ 명시적 바인딩`() {
        val provider =
            object : SearchFieldProvider<SearchTestEntity> {
                override fun customize(binder: SearchBinder<SearchTestEntity>) {
                    binder.bind("name").to(SearchOp.EQ)
                }
            }
        val spec = SearchSpecBuilder.build(mapOf("name" to listOf("Alice")), provider)!!
        val result = repo.findAll(spec)
        assertEquals(1, result.size)
        assertEquals("Alice", result[0].name)
    }

    @Test
    fun `바인딩 안 된 필드는 기본적으로 무시`() {
        val spec = SearchSpecBuilder.build(mapOf("name" to listOf("Alice")), emptyProvider)
        assertNull(spec)
    }

    @Test
    fun `LIKE 검색`() {
        val provider =
            object : SearchFieldProvider<SearchTestEntity> {
                override fun customize(binder: SearchBinder<SearchTestEntity>) {
                    binder.bind("name").to(SearchOp.LIKE)
                }
            }
        val spec = SearchSpecBuilder.build(mapOf("name" to listOf("li")), provider)!!
        val result = repo.findAll(spec)
        assertEquals(2, result.size) // Alice, Charlie
    }

    @Test
    fun `GTE 검색`() {
        val provider =
            object : SearchFieldProvider<SearchTestEntity> {
                override fun customize(binder: SearchBinder<SearchTestEntity>) {
                    binder.bind("amount").to(SearchOp.GTE)
                }
            }
        val spec = SearchSpecBuilder.build(mapOf("amount" to listOf("200")), provider)!!
        val result = repo.findAll(spec)
        assertEquals(2, result.size) // Bob(200), Charlie(300)
    }

    @Test
    fun `LTE 검색`() {
        val provider =
            object : SearchFieldProvider<SearchTestEntity> {
                override fun customize(binder: SearchBinder<SearchTestEntity>) {
                    binder.bind("count").to(SearchOp.LTE)
                }
            }
        val spec = SearchSpecBuilder.build(mapOf("count" to listOf("10")), provider)!!
        val result = repo.findAll(spec)
        assertEquals(2, result.size) // Alice(5), Bob(10)
    }

    @Test
    fun `BETWEEN 검색`() {
        val provider =
            object : SearchFieldProvider<SearchTestEntity> {
                override fun customize(binder: SearchBinder<SearchTestEntity>) {
                    binder.bind("amount").to(SearchOp.BETWEEN)
                }
            }
        val spec = SearchSpecBuilder.build(mapOf("amount" to listOf("150", "250")), provider)!!
        val result = repo.findAll(spec)
        assertEquals(1, result.size) // Bob(200)
    }

    @Test
    fun `IS_NULL 검색 - true`() {
        repo.save(SearchTestEntity(name = "NoAmount", status = "ACTIVE", amount = null))

        val provider =
            object : SearchFieldProvider<SearchTestEntity> {
                override fun customize(binder: SearchBinder<SearchTestEntity>) {
                    binder.bind("amount").to(SearchOp.IS_NULL)
                }
            }
        val spec = SearchSpecBuilder.build(mapOf("amount" to listOf("true")), provider)!!
        val result = repo.findAll(spec)
        assertEquals(1, result.size)
        assertEquals("NoAmount", result[0].name)
    }

    @Test
    fun `page, size, sort 파라미터 제외`() {
        val provider =
            object : SearchFieldProvider<SearchTestEntity> {
                override fun customize(binder: SearchBinder<SearchTestEntity>) {
                    binder.bind("name").to(SearchOp.EQ)
                }
            }
        val params =
            mapOf(
                "name" to listOf("Alice"),
                "page" to listOf("0"),
                "size" to listOf("10"),
                "sort" to listOf("name,asc"),
            )
        val spec = SearchSpecBuilder.build(params, provider)!!
        val result = repo.findAll(spec)
        assertEquals(1, result.size)
        assertEquals("Alice", result[0].name)
    }

    @Test
    fun `빈 params - null 반환`() {
        val spec = SearchSpecBuilder.build(emptyMap(), emptyProvider)
        assertNull(spec)
    }

    @Test
    fun `excluded 필드 제외`() {
        val provider =
            object : SearchFieldProvider<SearchTestEntity> {
                override fun customize(binder: SearchBinder<SearchTestEntity>) {
                    binder.bind("name").to(SearchOp.EQ)
                    binder.bind("status").to(SearchOp.EQ)
                    binder.excluding("status")
                }
            }
        val params = mapOf("status" to listOf("NONEXISTENT"), "name" to listOf("Alice"))
        val spec = SearchSpecBuilder.build(params, provider)!!
        val result = repo.findAll(spec)
        assertEquals(1, result.size) // status 조건은 무시되어 Alice가 반환됨
    }

    @Test
    fun `복합 조건 AND 결합`() {
        val provider =
            object : SearchFieldProvider<SearchTestEntity> {
                override fun customize(binder: SearchBinder<SearchTestEntity>) {
                    binder.bind("status").to(SearchOp.EQ)
                    binder.bind("name").to(SearchOp.EQ)
                }
            }
        val params = mapOf("status" to listOf("ACTIVE"), "name" to listOf("Alice"))
        val spec = SearchSpecBuilder.build(params, provider)!!
        val result = repo.findAll(spec)
        assertEquals(1, result.size)
        assertEquals("Alice", result[0].name)
    }

    @Test
    fun `defaultSort 반환`() {
        val provider =
            object : SearchFieldProvider<SearchTestEntity> {
                override fun defaultSort(): Sort = Sort.by(Sort.Direction.DESC, "createdAt")
            }
        assertEquals(Sort.Direction.DESC, provider.defaultSort().getOrderFor("createdAt")?.direction)
    }
}
