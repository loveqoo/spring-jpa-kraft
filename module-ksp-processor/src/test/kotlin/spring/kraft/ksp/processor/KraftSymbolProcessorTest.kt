package spring.kraft.ksp.processor

import com.tschuchort.compiletesting.KotlinCompilation
import com.tschuchort.compiletesting.SourceFile
import com.tschuchort.compiletesting.kspSourcesDir
import com.tschuchort.compiletesting.symbolProcessorProviders
import com.tschuchort.compiletesting.useKsp2
import java.io.File
import kotlin.test.Test
import kotlin.test.assertContains
import kotlin.test.assertEquals
import kotlin.test.assertNotNull
import kotlin.test.assertTrue

@OptIn(org.jetbrains.kotlin.compiler.plugin.ExperimentalCompilerApi::class)
class KraftSymbolProcessorTest {
    private val annotationSource =
        SourceFile.kotlin(
            "KraftAggregate.kt",
            """
            package spring.kraft.ksp.annotation

            import kotlin.reflect.KClass

            enum class CommonMethod {
                FIND_BY_ID, GET_ONE, FIND_ALL, CREATE, UPDATE, DELETE,
            }

            @Target(AnnotationTarget.FUNCTION)
            @Retention(AnnotationRetention.SOURCE)
            annotation class KraftExpose(
                val name: String = "",
            )

            @Target(AnnotationTarget.CLASS)
            @Retention(AnnotationRetention.SOURCE)
            annotation class KraftAggregate(
                val root: KClass<*>,
                val exclude: Array<CommonMethod> = [],
                val mediatorPackage: String = "",
            )
            """.trimIndent(),
        )

    private val stubSource =
        SourceFile.kotlin(
            "Stubs.kt",
            """
            package spring.kraft.service

            open class BaseEntity<ID : Comparable<ID>> {
                open var id: ID? = null
                open val isNew: Boolean get() = id == null
            }

            interface UpdateForm<ID : Comparable<ID>> {
                val id: ID
            }

            interface FormResolver<ID : Comparable<ID>, E : BaseEntity<ID>, in CF : Any, in UF : UpdateForm<ID>>

            interface ReadOnlyEntityService<ID, E>
                where ID : Comparable<ID>, E : BaseEntity<ID> {
                val tableName: String
                fun findById(id: ID): E? = null
                fun getOne(id: ID): E = throw NotImplementedError()
                fun findAll(pageable: org.springframework.data.domain.Pageable): org.springframework.data.domain.Page<E> = throw NotImplementedError()
            }

            interface BaseEntityService<ID, E, in CF, in UF> : ReadOnlyEntityService<ID, E>
                where ID : Comparable<ID>,
                      E : BaseEntity<ID>,
                      CF : Any,
                      UF : UpdateForm<ID>
            """.trimIndent(),
        )

    private fun compileAndGetGeneratedFiles(vararg sources: SourceFile): List<File> {
        val compilation =
            KotlinCompilation().apply {
                this.sources = listOf(annotationSource, stubSource, *sources)
                inheritClassPath = true
                useKsp2()
                symbolProcessorProviders += KraftSymbolProcessorProvider()
            }
        compilation.compile()

        val kspDir = compilation.kspSourcesDir
        return if (kspDir.exists()) {
            kspDir.walkTopDown().filter { it.isFile && it.extension == "kt" }.toList()
        } else {
            emptyList()
        }
    }

    @Test
    fun `BaseEntityService generates typed ID and interface plus AggregateMediator`() {
        val serviceSource =
            SourceFile.kotlin(
                "OrderService.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> {
                    override val id: Long = 0L
                }

                @KraftAggregate(root = OrderRoot::class)
                class OrderService : BaseEntityService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm> {
                    override val tableName: String = "orders"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        val idFile = generated.find { it.name == "OrderRootId.kt" }
        assertNotNull(idFile, "OrderRootId.kt should be generated")
        val idContent = idFile.readText()
        assertContains(idContent, "value class OrderRootId(val value: Long)")
        assertContains(idContent, "fun Long.toOrderRootId()")

        // Interface — single entity, so empty (no other entities to access)
        val interfaceFile = generated.find { it.name == "OrderRootInternalMediator.kt" }
        assertNotNull(interfaceFile, "OrderRootInternalMediator.kt should be generated")
        val interfaceContent = interfaceFile.readText()
        assertContains(interfaceContent, "interface OrderRootInternalMediator")
        assertTrue(!interfaceContent.contains("findOrderRootById"), "Single entity interface should be empty")

        // AggregateMediator — single entity, so no override methods (empty interface)
        val mediatorFile = generated.find { it.name == "OrderRootAggregateMediator.kt" }
        assertNotNull(mediatorFile, "OrderRootAggregateMediator.kt should be generated")
        val mediatorContent = mediatorFile.readText()
        println(mediatorContent)
        assertContains(mediatorContent, "open class OrderRootAggregateMediator")
        assertContains(mediatorContent, ": OrderRootInternalMediator")
        assertContains(mediatorContent, "@org.springframework.context.annotation.Lazy protected val orderService")
        // Single entity — no other entities to access, so no methods
        assertTrue(!mediatorContent.contains("findOrderRootById"), "Single entity mediator should have no methods")
        assertTrue(!mediatorContent.contains("createOrderRoot"), "CUD methods should not be in mediator")
        assertTrue(!mediatorContent.contains("@org.springframework.stereotype.Component"), "Should not have @Component")
    }

    @Test
    fun `ReadOnlyEntityService generates typed ID and read-only delegation`() {
        val serviceSource =
            SourceFile.kotlin(
                "ProductService.kt",
                """
                package com.example.product.service

                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.service.*

                class Product : BaseEntity<Long>()

                @KraftAggregate(root = Product::class)
                class ProductService : ReadOnlyEntityService<Long, Product> {
                    override val tableName: String = "products"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        val idFile = generated.find { it.name == "ProductId.kt" }
        assertNotNull(idFile, "ProductId.kt should be generated")

        val interfaceFile = generated.find { it.name == "ProductInternalMediator.kt" }
        assertNotNull(interfaceFile, "ProductInternalMediator.kt should be generated")
        val interfaceContent = interfaceFile.readText()
        assertContains(interfaceContent, "interface ProductInternalMediator")

        val mediatorFile = generated.find { it.name == "ProductAggregateMediator.kt" }
        assertNotNull(mediatorFile, "ProductAggregateMediator.kt should be generated")
        val mediatorContent = mediatorFile.readText()
        assertContains(mediatorContent, "open class ProductAggregateMediator")
        assertContains(mediatorContent, ": ProductInternalMediator")
        // Single entity — no other entities, so no methods in mediator
        assertTrue(!mediatorContent.contains("createProduct"), "Should not have create method")
        assertTrue(!mediatorContent.contains("updateProduct"), "Should not have update method")
        assertTrue(!mediatorContent.contains("deleteProduct"), "Should not have delete method")
    }

    @Test
    fun `same root with multiple services generates interfaces and AggregateMediator`() {
        val serviceSource =
            SourceFile.kotlin(
                "OrderServices.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderItem : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> { override val id: Long = 0L }
                class OrderItemCreateForm
                class OrderItemUpdateForm : UpdateForm<Long> { override val id: Long = 0L }

                @KraftAggregate(root = OrderRoot::class)
                class OrderService : BaseEntityService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm> {
                    override val tableName: String = "orders"
                }

                @KraftAggregate(root = OrderRoot::class)
                class OrderItemService : BaseEntityService<Long, OrderItem, OrderItemCreateForm, OrderItemUpdateForm> {
                    override val tableName: String = "order_items"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        // Two interfaces + one AggregateMediator
        val orderInterface = generated.find { it.name == "OrderRootInternalMediator.kt" }
        assertNotNull(orderInterface, "OrderRootInternalMediator.kt should be generated")
        val orderInterfaceContent = orderInterface.readText()
        assertContains(orderInterfaceContent, "interface OrderRootInternalMediator")
        // Order's interface has OrderItem read methods (access to other entities)
        assertContains(orderInterfaceContent, "findOrderItemById")
        assertContains(orderInterfaceContent, "getOneOrderItem")
        assertContains(orderInterfaceContent, "findAllOrderItem")
        // Should NOT have Order's own methods
        assertTrue(!orderInterfaceContent.contains("findOrderRootById"), "Should not have own entity methods")

        val orderItemInterface = generated.find { it.name == "OrderItemInternalMediator.kt" }
        assertNotNull(orderItemInterface, "OrderItemInternalMediator.kt should be generated")
        val orderItemInterfaceContent = orderItemInterface.readText()
        assertContains(orderItemInterfaceContent, "interface OrderItemInternalMediator")
        // OrderItem's interface has Order read methods
        assertContains(orderItemInterfaceContent, "findOrderRootById")
        assertContains(orderItemInterfaceContent, "getOneOrderRoot")
        assertContains(orderItemInterfaceContent, "findAllOrderRoot")
        // Should NOT have OrderItem's own methods
        assertTrue(!orderItemInterfaceContent.contains("findOrderItemById"), "Should not have own entity methods")

        val mediatorFile = generated.find { it.name == "OrderRootAggregateMediator.kt" }
        assertNotNull(mediatorFile, "OrderRootAggregateMediator.kt should be generated")
        val mediatorContent = mediatorFile.readText()
        assertContains(mediatorContent, "open class OrderRootAggregateMediator")
        assertContains(mediatorContent, "OrderRootInternalMediator")
        assertContains(mediatorContent, "OrderItemInternalMediator")
        assertContains(mediatorContent, "override fun findOrderRootById")
        assertContains(mediatorContent, "override fun findOrderItemById")
        // No CUD methods
        assertTrue(!mediatorContent.contains("createOrderRoot"), "CUD should not be in mediator")
        assertTrue(!mediatorContent.contains("createOrderItem"), "CUD should not be in mediator")

        val idFiles = generated.filter { it.name.endsWith("Id.kt") }
        assertEquals(2, idFiles.size, "Should generate two ID files")
        assertTrue(idFiles.any { it.name == "OrderRootId.kt" })
        assertTrue(idFiles.any { it.name == "OrderItemId.kt" })
    }

    @Test
    fun `different roots generate separate interface sets and AggregateMediators`() {
        val serviceSource =
            SourceFile.kotlin(
                "Services.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> { override val id: Long = 0L }

                class PaymentRoot : BaseEntity<Long>()
                class PaymentCreateForm
                class PaymentUpdateForm : UpdateForm<Long> { override val id: Long = 0L }

                @KraftAggregate(root = OrderRoot::class)
                class OrderService : BaseEntityService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm> {
                    override val tableName: String = "orders"
                }

                @KraftAggregate(root = PaymentRoot::class)
                class PaymentService : BaseEntityService<Long, PaymentRoot, PaymentCreateForm, PaymentUpdateForm> {
                    override val tableName: String = "payments"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)
        val mediatorFiles = generated.filter { it.name.endsWith("AggregateMediator.kt") }
        assertEquals(2, mediatorFiles.size, "Should generate two aggregate mediators")
        assertTrue(mediatorFiles.any { it.name == "OrderRootAggregateMediator.kt" })
        assertTrue(mediatorFiles.any { it.name == "PaymentRootAggregateMediator.kt" })

        val interfaceFiles = generated.filter { it.name.endsWith("InternalMediator.kt") }
        assertEquals(2, interfaceFiles.size, "Should generate two interfaces")
        assertTrue(interfaceFiles.any { it.name == "OrderRootInternalMediator.kt" })
        assertTrue(interfaceFiles.any { it.name == "PaymentRootInternalMediator.kt" })
    }

    @Test
    fun `exclude single method omits findById from interface and mediator`() {
        val serviceSource =
            SourceFile.kotlin(
                "OrderServices.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.CommonMethod
                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderItem : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> { override val id: Long = 0L }
                class OrderItemCreateForm
                class OrderItemUpdateForm : UpdateForm<Long> { override val id: Long = 0L }

                @KraftAggregate(root = OrderRoot::class, exclude = [CommonMethod.FIND_BY_ID])
                class OrderService : BaseEntityService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm> {
                    override val tableName: String = "orders"
                }

                @KraftAggregate(root = OrderRoot::class)
                class OrderItemService : BaseEntityService<Long, OrderItem, OrderItemCreateForm, OrderItemUpdateForm> {
                    override val tableName: String = "order_items"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        // OrderItem's interface (shows OrderRoot methods) should not have findOrderRootById
        val orderItemInterface = generated.find { it.name == "OrderItemInternalMediator.kt" }
        assertNotNull(orderItemInterface)
        val orderItemInterfaceContent = orderItemInterface.readText()
        assertTrue(!orderItemInterfaceContent.contains("findOrderRootById"), "findById should be excluded")
        assertContains(orderItemInterfaceContent, "getOneOrderRoot")
        assertContains(orderItemInterfaceContent, "findAllOrderRoot")

        val mediatorFile = generated.find { it.name == "OrderRootAggregateMediator.kt" }
        assertNotNull(mediatorFile)
        val mediatorContent = mediatorFile.readText()
        assertTrue(!mediatorContent.contains("findOrderRootById"), "findById should be excluded from mediator")
        assertContains(mediatorContent, "getOneOrderRoot")
    }

    @Test
    fun `exclude multiple methods omits findAll from interface`() {
        val serviceSource =
            SourceFile.kotlin(
                "OrderServices.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.CommonMethod
                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderItem : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> { override val id: Long = 0L }
                class OrderItemCreateForm
                class OrderItemUpdateForm : UpdateForm<Long> { override val id: Long = 0L }

                @KraftAggregate(root = OrderRoot::class, exclude = [CommonMethod.FIND_ALL, CommonMethod.DELETE])
                class OrderService : BaseEntityService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm> {
                    override val tableName: String = "orders"
                }

                @KraftAggregate(root = OrderRoot::class)
                class OrderItemService : BaseEntityService<Long, OrderItem, OrderItemCreateForm, OrderItemUpdateForm> {
                    override val tableName: String = "order_items"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        // OrderItem's interface should not have findAllOrderRoot (excluded)
        val orderItemInterface = generated.find { it.name == "OrderItemInternalMediator.kt" }
        assertNotNull(orderItemInterface)
        val content = orderItemInterface.readText()
        assertTrue(!content.contains("findAllOrderRoot"), "findAll should be excluded")
        assertContains(content, "findOrderRootById")
        assertContains(content, "getOneOrderRoot")
        // DELETE is CUD — already not in mediator, so no effect
    }

    @Test
    fun `exclude on read-only service ignores mutation methods gracefully`() {
        val serviceSource =
            SourceFile.kotlin(
                "ProductServices.kt",
                """
                package com.example.product.service

                import spring.kraft.ksp.annotation.CommonMethod
                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.service.*

                class Product : BaseEntity<Long>()
                class ProductDetail : BaseEntity<Long>()

                @KraftAggregate(root = Product::class, exclude = [CommonMethod.CREATE])
                class ProductService : ReadOnlyEntityService<Long, Product> {
                    override val tableName: String = "products"
                }

                @KraftAggregate(root = Product::class)
                class ProductDetailService : ReadOnlyEntityService<Long, ProductDetail> {
                    override val tableName: String = "product_details"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        // Product's interface should have ProductDetail read methods
        val productInterface = generated.find { it.name == "ProductInternalMediator.kt" }
        assertNotNull(productInterface)
        val productInterfaceContent = productInterface.readText()
        assertContains(productInterfaceContent, "findProductDetailById")
        assertContains(productInterfaceContent, "getOneProductDetail")
        assertContains(productInterfaceContent, "findAllProductDetail")

        // ProductDetail's interface should have Product read methods (CREATE exclude is irrelevant)
        val detailInterface = generated.find { it.name == "ProductDetailInternalMediator.kt" }
        assertNotNull(detailInterface)
        val detailInterfaceContent = detailInterface.readText()
        assertContains(detailInterfaceContent, "findProductById")
        assertContains(detailInterfaceContent, "getOneProduct")
        assertContains(detailInterfaceContent, "findAllProduct")
    }

    @Test
    fun `KraftExpose generates custom method in interface and mediator`() {
        val serviceSource =
            SourceFile.kotlin(
                "OrderServices.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.ksp.annotation.KraftExpose
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderItem : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> { override val id: Long = 0L }
                class OrderItemCreateForm
                class OrderItemUpdateForm : UpdateForm<Long> { override val id: Long = 0L }

                @KraftAggregate(root = OrderRoot::class)
                class OrderService : BaseEntityService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm> {
                    override val tableName: String = "orders"

                    @KraftExpose
                    fun findByStatus(status: String): List<OrderRoot> = emptyList()
                }

                @KraftAggregate(root = OrderRoot::class)
                class OrderItemService : BaseEntityService<Long, OrderItem, OrderItemCreateForm, OrderItemUpdateForm> {
                    override val tableName: String = "order_items"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        // OrderItem's interface should have the custom method (it accesses OrderRoot)
        val orderItemInterface = generated.find { it.name == "OrderItemInternalMediator.kt" }
        assertNotNull(orderItemInterface)
        val interfaceContent = orderItemInterface.readText()
        assertContains(interfaceContent, "findOrderRootByStatus(status: String): List<OrderRoot>")

        // AggregateMediator should have override
        val mediatorFile = generated.find { it.name == "OrderRootAggregateMediator.kt" }
        assertNotNull(mediatorFile)
        val mediatorContent = mediatorFile.readText()
        assertContains(mediatorContent, "override fun findOrderRootByStatus(status: String): List<OrderRoot>")
        assertContains(mediatorContent, "orderService.findByStatus(status)")
    }

    @Test
    fun `KraftExpose with custom name uses specified name`() {
        val serviceSource =
            SourceFile.kotlin(
                "OrderServices.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.ksp.annotation.KraftExpose
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderItem : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> { override val id: Long = 0L }
                class OrderItemCreateForm
                class OrderItemUpdateForm : UpdateForm<Long> { override val id: Long = 0L }

                @KraftAggregate(root = OrderRoot::class)
                class OrderService : BaseEntityService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm> {
                    override val tableName: String = "orders"

                    @KraftExpose(name = "searchActive")
                    fun findActiveOrders(): List<OrderRoot> = emptyList()
                }

                @KraftAggregate(root = OrderRoot::class)
                class OrderItemService : BaseEntityService<Long, OrderItem, OrderItemCreateForm, OrderItemUpdateForm> {
                    override val tableName: String = "order_items"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        val orderItemInterface = generated.find { it.name == "OrderItemInternalMediator.kt" }
        assertNotNull(orderItemInterface)
        val interfaceContent = orderItemInterface.readText()
        assertContains(interfaceContent, "fun searchActive()")
        assertTrue(!interfaceContent.contains("fun findActiveOrders"), "Should use custom name, not original")

        val mediatorFile = generated.find { it.name == "OrderRootAggregateMediator.kt" }
        assertNotNull(mediatorFile)
        val mediatorContent = mediatorFile.readText()
        assertContains(mediatorContent, "override fun searchActive()")
    }

    @Test
    fun `mediatorPackage override generates files in specified package`() {
        val serviceSource =
            SourceFile.kotlin(
                "OrderService.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> {
                    override val id: Long = 0L
                }

                @KraftAggregate(root = OrderRoot::class, mediatorPackage = "com.example.custom")
                class OrderService : BaseEntityService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm> {
                    override val tableName: String = "orders"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        val interfaceFile = generated.find { it.name == "OrderRootInternalMediator.kt" }
        assertNotNull(interfaceFile)
        val interfaceContent = interfaceFile.readText()
        assertContains(interfaceContent, "package com.example.custom")

        val mediatorFile = generated.find { it.name == "OrderRootAggregateMediator.kt" }
        assertNotNull(mediatorFile)
        val mediatorContent = mediatorFile.readText()
        assertContains(mediatorContent, "package com.example.custom")
        assertTrue(!mediatorContent.contains("package com.example.order.mediator"), "Should not use default package")
    }

    @Test
    fun `mediatorPackage conflict prevents mediator generation`() {
        val serviceSource =
            SourceFile.kotlin(
                "OrderServices.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderItem : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> { override val id: Long = 0L }
                class OrderItemCreateForm
                class OrderItemUpdateForm : UpdateForm<Long> { override val id: Long = 0L }

                @KraftAggregate(root = OrderRoot::class, mediatorPackage = "com.example.pkg1")
                class OrderService : BaseEntityService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm> {
                    override val tableName: String = "orders"
                }

                @KraftAggregate(root = OrderRoot::class, mediatorPackage = "com.example.pkg2")
                class OrderItemService : BaseEntityService<Long, OrderItem, OrderItemCreateForm, OrderItemUpdateForm> {
                    override val tableName: String = "order_items"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)
        val mediatorFiles =
            generated.filter { it.name.endsWith("InternalMediator.kt") || it.name.endsWith("AggregateMediator.kt") }
        assertEquals(0, mediatorFiles.size, "Should not generate mediator when packages conflict")

        val idFiles = generated.filter { it.name.endsWith("Id.kt") }
        assertTrue(idFiles.isNotEmpty(), "ID files should still be generated")
    }

    // --- New tests ---

    @Test
    fun `interface contains only other entities methods`() {
        val serviceSource =
            SourceFile.kotlin(
                "OrderServices.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderItem : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> { override val id: Long = 0L }
                class OrderItemCreateForm
                class OrderItemUpdateForm : UpdateForm<Long> { override val id: Long = 0L }

                @KraftAggregate(root = OrderRoot::class)
                class OrderService : BaseEntityService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm> {
                    override val tableName: String = "orders"
                }

                @KraftAggregate(root = OrderRoot::class)
                class OrderItemService : BaseEntityService<Long, OrderItem, OrderItemCreateForm, OrderItemUpdateForm> {
                    override val tableName: String = "order_items"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        // OrderRoot's interface should ONLY have OrderItem methods, NOT OrderRoot methods
        val orderInterface = generated.find { it.name == "OrderRootInternalMediator.kt" }
        assertNotNull(orderInterface)
        val orderContent = orderInterface.readText()
        assertContains(orderContent, "findOrderItemById")
        assertContains(orderContent, "getOneOrderItem")
        assertContains(orderContent, "findAllOrderItem")
        assertTrue(!orderContent.contains("findOrderRootById"), "Should not contain own entity methods")
        assertTrue(!orderContent.contains("getOneOrderRoot"), "Should not contain own entity methods")
        assertTrue(!orderContent.contains("findAllOrderRoot"), "Should not contain own entity methods")

        // OrderItem's interface should ONLY have OrderRoot methods, NOT OrderItem methods
        val orderItemInterface = generated.find { it.name == "OrderItemInternalMediator.kt" }
        assertNotNull(orderItemInterface)
        val orderItemContent = orderItemInterface.readText()
        assertContains(orderItemContent, "findOrderRootById")
        assertContains(orderItemContent, "getOneOrderRoot")
        assertContains(orderItemContent, "findAllOrderRoot")
        assertTrue(!orderItemContent.contains("findOrderItemById"), "Should not contain own entity methods")
        assertTrue(!orderItemContent.contains("getOneOrderItem"), "Should not contain own entity methods")
        assertTrue(!orderItemContent.contains("findAllOrderItem"), "Should not contain own entity methods")
    }

    @Test
    fun `AggregateMediator implements all interfaces`() {
        val serviceSource =
            SourceFile.kotlin(
                "OrderServices.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderItem : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> { override val id: Long = 0L }
                class OrderItemCreateForm
                class OrderItemUpdateForm : UpdateForm<Long> { override val id: Long = 0L }

                @KraftAggregate(root = OrderRoot::class)
                class OrderService : BaseEntityService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm> {
                    override val tableName: String = "orders"
                }

                @KraftAggregate(root = OrderRoot::class)
                class OrderItemService : BaseEntityService<Long, OrderItem, OrderItemCreateForm, OrderItemUpdateForm> {
                    override val tableName: String = "order_items"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        val mediatorFile = generated.find { it.name == "OrderRootAggregateMediator.kt" }
        assertNotNull(mediatorFile)
        val content = mediatorFile.readText()

        // Implements both interfaces
        assertContains(content, "OrderRootInternalMediator")
        assertContains(content, "OrderItemInternalMediator")

        // All methods are override
        assertContains(content, "override fun findOrderRootById")
        assertContains(content, "override fun getOneOrderRoot")
        assertContains(content, "override fun findAllOrderRoot")
        assertContains(content, "override fun findOrderItemById")
        assertContains(content, "override fun getOneOrderItem")
        assertContains(content, "override fun findAllOrderItem")

        // Constructor has protected val services
        assertContains(content, "@org.springframework.context.annotation.Lazy protected val orderService")
        assertContains(content, "@org.springframework.context.annotation.Lazy protected val orderItemService")

        // No @Component
        assertTrue(!content.contains("@org.springframework.stereotype.Component"))
    }

    @Test
    fun `single entity generates empty interface and mediator`() {
        val serviceSource =
            SourceFile.kotlin(
                "OrderService.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> { override val id: Long = 0L }

                @KraftAggregate(root = OrderRoot::class)
                class OrderService : BaseEntityService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm> {
                    override val tableName: String = "orders"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        // Interface exists but is empty (no other entities)
        val interfaceFile = generated.find { it.name == "OrderRootInternalMediator.kt" }
        assertNotNull(interfaceFile, "Interface should be generated even for single entity")
        val interfaceContent = interfaceFile.readText()
        assertContains(interfaceContent, "interface OrderRootInternalMediator")
        assertTrue(!interfaceContent.contains("fun find"), "Single entity interface should have no methods")
        assertTrue(!interfaceContent.contains("fun get"), "Single entity interface should have no methods")

        // AggregateMediator exists, implements empty interface, has service constructor
        val mediatorFile = generated.find { it.name == "OrderRootAggregateMediator.kt" }
        assertNotNull(mediatorFile, "AggregateMediator should be generated even for single entity")
        val mediatorContent = mediatorFile.readText()
        assertContains(mediatorContent, "open class OrderRootAggregateMediator")
        assertContains(mediatorContent, ": OrderRootInternalMediator")
        assertContains(mediatorContent, "@org.springframework.context.annotation.Lazy protected val orderService")
    }

    @Test
    fun `KraftExpose suspend function generates suspend method in interface and mediator`() {
        val serviceSource =
            SourceFile.kotlin(
                "OrderServices.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.ksp.annotation.KraftExpose
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderItem : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> { override val id: Long = 0L }
                class OrderItemCreateForm
                class OrderItemUpdateForm : UpdateForm<Long> { override val id: Long = 0L }

                @KraftAggregate(root = OrderRoot::class)
                class OrderService : BaseEntityService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm> {
                    override val tableName: String = "orders"

                    @KraftExpose
                    suspend fun findByStatus(status: String): List<OrderRoot> = emptyList()
                }

                @KraftAggregate(root = OrderRoot::class)
                class OrderItemService : BaseEntityService<Long, OrderItem, OrderItemCreateForm, OrderItemUpdateForm> {
                    override val tableName: String = "order_items"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        // Interface should have suspend method
        val orderItemInterface = generated.find { it.name == "OrderItemInternalMediator.kt" }
        assertNotNull(orderItemInterface)
        val interfaceContent = orderItemInterface.readText()
        assertContains(interfaceContent, "suspend fun findOrderRootByStatus(status: String): List<OrderRoot>")

        // AggregateMediator should have override suspend method
        val mediatorFile = generated.find { it.name == "OrderRootAggregateMediator.kt" }
        assertNotNull(mediatorFile)
        val mediatorContent = mediatorFile.readText()
        assertContains(mediatorContent, "override suspend fun findOrderRootByStatus(status: String): List<OrderRoot>")
        assertContains(mediatorContent, "orderService.findByStatus(status)")
    }

    @Test
    fun `intermediate abstract class with generic type substitution resolves correctly`() {
        val serviceSource =
            SourceFile.kotlin(
                "OrderServices.kt",
                """
                package com.example.order.service

                import spring.kraft.ksp.annotation.KraftAggregate
                import spring.kraft.service.*

                class OrderRoot : BaseEntity<Long>()
                class OrderCreateForm
                class OrderUpdateForm : UpdateForm<Long> { override val id: Long = 0L }

                abstract class AbstractOrderService<ID, E, CF, UF> : BaseEntityService<ID, E, CF, UF>
                    where ID : Comparable<ID>, E : BaseEntity<ID>, CF : Any, UF : UpdateForm<ID> {
                    abstract fun customMethod(): String
                }

                @KraftAggregate(root = OrderRoot::class)
                class ConcreteOrderService : AbstractOrderService<Long, OrderRoot, OrderCreateForm, OrderUpdateForm>() {
                    override val tableName: String = "orders"
                    override fun customMethod(): String = "test"
                }
                """.trimIndent(),
            )

        val generated = compileAndGetGeneratedFiles(serviceSource)

        val idFile = generated.find { it.name == "OrderRootId.kt" }
        assertNotNull(idFile, "OrderRootId.kt should be generated")
        val idContent = idFile.readText()
        assertContains(idContent, "value class OrderRootId(val value: Long)")

        val mediatorFile = generated.find { it.name == "OrderRootAggregateMediator.kt" }
        assertNotNull(mediatorFile, "AggregateMediator should be generated")
        val mediatorContent = mediatorFile.readText()
        assertContains(mediatorContent, "open class OrderRootAggregateMediator")
    }
}
