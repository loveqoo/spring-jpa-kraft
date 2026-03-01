package spring.kraft.ddl.parser;

import org.antlr.v4.runtime.Parser;
import org.antlr.v4.runtime.TokenStream;

public abstract class MySQLParserBase extends Parser {
    protected MySQLParserBase(TokenStream input) {
        super(input);
    }
}
