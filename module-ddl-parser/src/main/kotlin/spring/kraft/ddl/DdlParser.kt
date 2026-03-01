package spring.kraft.ddl

import org.antlr.v4.runtime.BaseErrorListener
import org.antlr.v4.runtime.CharStreams
import org.antlr.v4.runtime.CommonTokenStream
import org.antlr.v4.runtime.RecognitionException
import org.antlr.v4.runtime.Recognizer
import spring.kraft.ddl.parser.MySQLLexer
import spring.kraft.ddl.parser.MySQLParser
import java.io.File

class DdlParser {
    fun parse(sqlFile: File): TableSchema {
        val sqlLines = sqlFile.readLines()
        val syntaxErrors = mutableListOf<String>()
        val errorListener =
            object : BaseErrorListener() {
                override fun syntaxError(
                    recognizer: Recognizer<*, *>?,
                    offendingSymbol: Any?,
                    line: Int,
                    charPositionInLine: Int,
                    msg: String?,
                    e: RecognitionException?,
                ) {
                    val context = buildErrorContext(sqlLines, line, charPositionInLine)
                    syntaxErrors += "line $line:$charPositionInLine $msg\n$context"
                }
            }

        val lexer = MySQLLexer(CharStreams.fromPath(sqlFile.toPath()))
        lexer.removeErrorListeners()
        lexer.addErrorListener(errorListener)

        val tokens = CommonTokenStream(lexer)
        val parser = MySQLParser(tokens)
        parser.removeErrorListeners()
        parser.addErrorListener(errorListener)

        val tree = parser.sqlStatements()

        require(syntaxErrors.isEmpty()) {
            "DDL syntax error(s) in ${sqlFile.name}:\n${syntaxErrors.joinToString("\n")}"
        }

        val visitor = CreateTableVisitor()
        visitor.visit(tree)
        val parseErrors = visitor.getParseErrors()
        require(parseErrors.isEmpty()) {
            "DDL parse failed for ${parseErrors.size} CREATE TABLE statement(s):\n${parseErrors.joinToString("\n")}"
        }
        return TableSchema(visitor.getTables())
    }

    private fun buildErrorContext(
        lines: List<String>,
        errorLine: Int,
        charPosition: Int,
    ): String {
        val sb = StringBuilder()
        val start = maxOf(1, errorLine - 1)
        val end = minOf(lines.size, errorLine + 1)

        for (lineNum in start..end) {
            val prefix = if (lineNum == errorLine) ">>>" else "   "
            sb.appendLine("$prefix $lineNum | ${lines[lineNum - 1]}")
            if (lineNum == errorLine) {
                sb.appendLine("    ${" ".repeat(lineNum.toString().length)} | ${" ".repeat(charPosition)}^")
            }
        }
        return sb.toString().trimEnd()
    }
}
