@file:OptIn(org.jetbrains.kotlin.compiler.plugin.ExperimentalCompilerApi::class)

package spring.kraft.entity.gen.generator

import com.tschuchort.compiletesting.KotlinCompilation
import com.tschuchort.compiletesting.SourceFile
import spring.kraft.entity.gen.DdlParser
import spring.kraft.entity.gen.config.AggregateConfigParser
import java.io.File
import kotlin.test.Test
import kotlin.test.assertEquals

class SkeletonCompileTest {
    private val ddlParser = DdlParser()
    private val configParser = AggregateConfigParser()
    private val generator = SkeletonGenerator()

    @Test
    fun `generated aggregate root code compiles`() {
        val sql =
            """
            CREATE TABLE orders (
              id BIGINT NOT NULL AUTO_INCREMENT,
              name VARCHAR(255) NOT NULL UNIQUE,
              status VARCHAR(50) NOT NULL,
              version BIGINT NOT NULL,
              deleted BOOLEAN NOT NULL,
              created_at TIMESTAMP,
              created_by VARCHAR(255),
              updated_at TIMESTAMP,
              updated_by VARCHAR(255),
              PRIMARY KEY (id)
            );

            CREATE TABLE order_items (
              id BIGINT NOT NULL AUTO_INCREMENT,
              order_id BIGINT NOT NULL,
              product_name VARCHAR(255) NOT NULL,
              quantity INT NOT NULL,
              price DECIMAL(10,2) NOT NULL,
              created_at TIMESTAMP,
              created_by VARCHAR(255),
              updated_at TIMESTAMP,
              updated_by VARCHAR(255),
              PRIMARY KEY (id)
            );
            """.trimIndent()

        val config =
            """
            {
              "basePackage": "com.example.order",
              "aggregates": [
                {
                  "root": "orders",
                  "relations": [
                    { "type": "OneToMany", "target": "order_items", "joinColumn": "order_id" }
                  ],
                  "entities": [
                    {
                      "table": "order_items",
                      "relations": [
                        { "type": "ManyToOne", "target": "orders", "joinColumn": "order_id" }
                      ]
                    }
                  ]
                }
              ]
            }
            """.trimIndent()

        assertGeneratedCodeCompiles(sql, config)
    }

    @Test
    fun `generated code with String ID compiles`() {
        val sql =
            """
            CREATE TABLE categories (
              id VARCHAR(36) NOT NULL,
              name VARCHAR(255) NOT NULL,
              version BIGINT NOT NULL,
              deleted BOOLEAN NOT NULL,
              created_at TIMESTAMP,
              created_by VARCHAR(255),
              updated_at TIMESTAMP,
              updated_by VARCHAR(255),
              PRIMARY KEY (id)
            );

            CREATE TABLE items (
              id BIGINT NOT NULL AUTO_INCREMENT,
              category_id VARCHAR(36) NOT NULL,
              title VARCHAR(255) NOT NULL,
              created_at TIMESTAMP,
              created_by VARCHAR(255),
              updated_at TIMESTAMP,
              updated_by VARCHAR(255),
              PRIMARY KEY (id)
            );
            """.trimIndent()

        val config =
            """
            {
              "basePackage": "com.example.catalog",
              "aggregates": [
                {
                  "root": "categories",
                  "idStrategy": "NONE",
                  "relations": [
                    { "type": "OneToMany", "target": "items", "joinColumn": "category_id" }
                  ],
                  "entities": [
                    {
                      "table": "items",
                      "relations": [
                        { "type": "ManyToOne", "target": "categories", "joinColumn": "category_id" }
                      ]
                    }
                  ]
                }
              ]
            }
            """.trimIndent()

        assertGeneratedCodeCompiles(sql, config)
    }

    @Test
    fun `generated code from config JSON with embedded tableSchema compiles`() {
        val configJson =
            """
            {
              "basePackage": "com.example.order",
              "idStrategy": "IDENTITY",
              "aggregates": [
                {
                  "root": "orders",
                  "relations": [
                    { "type": "OneToMany", "target": "order_items", "joinColumn": "order_id" }
                  ],
                  "entities": [
                    {
                      "table": "order_items",
                      "relations": [
                        { "type": "ManyToOne", "target": "orders", "joinColumn": "order_id" }
                      ]
                    }
                  ]
                }
              ],
              "tableSchema": {
                "tables": [
                  {
                    "name": "orders",
                    "schema": null,
                    "columns": [
                      { "name": "id", "typeName": "BIGINT", "typeValue": null, "primaryKey": true, "notNull": true, "unique": false, "autoIncrement": true, "defaultValue": null, "note": null },
                      { "name": "name", "typeName": "VARCHAR", "typeValue": 255, "primaryKey": false, "notNull": true, "unique": true, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "status", "typeName": "VARCHAR", "typeValue": 50, "primaryKey": false, "notNull": true, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "version", "typeName": "BIGINT", "typeValue": null, "primaryKey": false, "notNull": true, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "deleted", "typeName": "BOOLEAN", "typeValue": null, "primaryKey": false, "notNull": true, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "created_at", "typeName": "DATETIME", "typeValue": null, "primaryKey": false, "notNull": false, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "created_by", "typeName": "VARCHAR", "typeValue": 100, "primaryKey": false, "notNull": false, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "updated_at", "typeName": "DATETIME", "typeValue": null, "primaryKey": false, "notNull": false, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "updated_by", "typeName": "VARCHAR", "typeValue": 100, "primaryKey": false, "notNull": false, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null }
                    ],
                    "indexes": [],
                    "engine": "InnoDB",
                    "charset": "utf8mb4",
                    "comment": null
                  },
                  {
                    "name": "order_items",
                    "schema": null,
                    "columns": [
                      { "name": "id", "typeName": "BIGINT", "typeValue": null, "primaryKey": true, "notNull": true, "unique": false, "autoIncrement": true, "defaultValue": null, "note": null },
                      { "name": "order_id", "typeName": "BIGINT", "typeValue": null, "primaryKey": false, "notNull": true, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "product_name", "typeName": "VARCHAR", "typeValue": 255, "primaryKey": false, "notNull": true, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "quantity", "typeName": "INT", "typeValue": null, "primaryKey": false, "notNull": true, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "price", "typeName": "DECIMAL", "typeValue": 10, "primaryKey": false, "notNull": true, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "created_at", "typeName": "DATETIME", "typeValue": null, "primaryKey": false, "notNull": false, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "created_by", "typeName": "VARCHAR", "typeValue": 100, "primaryKey": false, "notNull": false, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "updated_at", "typeName": "DATETIME", "typeValue": null, "primaryKey": false, "notNull": false, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null },
                      { "name": "updated_by", "typeName": "VARCHAR", "typeValue": 100, "primaryKey": false, "notNull": false, "unique": false, "autoIncrement": false, "defaultValue": null, "note": null }
                    ],
                    "indexes": [],
                    "engine": "InnoDB",
                    "charset": "utf8mb4",
                    "comment": null
                  }
                ]
              }
            }
            """.trimIndent()

        assertConfigJsonCompiles(configJson)
    }

    @Test
    fun `generated code with multiple parents compiles`() {
        val sql =
            """
            CREATE TABLE orders (
              id BIGINT NOT NULL AUTO_INCREMENT,
              name VARCHAR(255) NOT NULL,
              version BIGINT NOT NULL,
              deleted BOOLEAN NOT NULL,
              PRIMARY KEY (id)
            );

            CREATE TABLE products (
              id BIGINT NOT NULL AUTO_INCREMENT,
              name VARCHAR(255) NOT NULL,
              PRIMARY KEY (id)
            );

            CREATE TABLE order_items (
              id BIGINT NOT NULL AUTO_INCREMENT,
              order_id BIGINT NOT NULL,
              product_id BIGINT NOT NULL,
              quantity INT NOT NULL,
              PRIMARY KEY (id)
            );
            """.trimIndent()

        val config =
            """
            {
              "basePackage": "com.example.shop",
              "aggregates": [
                {
                  "root": "orders",
                  "relations": [
                    { "type": "OneToMany", "target": "order_items", "joinColumn": "order_id" }
                  ],
                  "entities": [
                    {
                      "table": "order_items",
                      "relations": [
                        { "type": "ManyToOne", "target": "orders", "joinColumn": "order_id" },
                        { "type": "ManyToOne", "target": "products", "joinColumn": "product_id" }
                      ]
                    }
                  ]
                }
              ]
            }
            """.trimIndent()

        assertGeneratedCodeCompiles(sql, config)
    }

    private fun assertConfigJsonCompiles(configJson: String) {
        val outputDir = createTempDir()
        try {
            generator.generate(configJson, outputDir)
            assertCompiles(outputDir)
        } finally {
            outputDir.deleteRecursively()
        }
    }

    private fun assertGeneratedCodeCompiles(
        sql: String,
        config: String,
    ) {
        val outputDir = createTempDir()
        try {
            val schema = parseSchema(sql)
            val aggConfig = configParser.parse(config)
            generator.generate(schema, aggConfig, outputDir)
            assertCompiles(outputDir)
        } finally {
            outputDir.deleteRecursively()
        }
    }

    private fun assertCompiles(outputDir: File) {
        val sources =
            outputDir
                .walkTopDown()
                .filter { it.extension == "kt" }
                .map { SourceFile.new(it.name, it.readText()) }
                .toList()

        val compilation =
            KotlinCompilation().apply {
                this.sources = sources
                inheritClassPath = true
            }
        val result = compilation.compile()

        assertEquals(
            KotlinCompilation.ExitCode.OK,
            result.exitCode,
            "Compilation failed:\n${result.messages}",
        )
    }

    private fun parseSchema(sql: String): spring.kraft.entity.gen.TableSchema {
        val dir = createTempDir()
        return try {
            val file = File(dir, "schema.sql")
            file.writeText(sql)
            ddlParser.parse(file)
        } finally {
            dir.deleteRecursively()
        }
    }

    private fun createTempDir(): File {
        val dir = File(System.getProperty("java.io.tmpdir"), "skeleton-compile-test-${System.nanoTime()}")
        dir.mkdirs()
        return dir
    }
}
