package spring.kraft.entity.gen.parser;

import org.antlr.v4.runtime.Parser;
import org.antlr.v4.runtime.TokenStream;

public abstract class MySQLParserBase extends Parser {
    protected MySQLParserBase(TokenStream input) {
        super(input);
    }
}
