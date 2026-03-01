package spring.kraft.entity.gen.parser;

import org.antlr.v4.runtime.CharStream;
import org.antlr.v4.runtime.Lexer;

public abstract class MySQLLexerBase extends Lexer {
    protected MySQLLexerBase(CharStream input) {
        super(input);
    }
}
