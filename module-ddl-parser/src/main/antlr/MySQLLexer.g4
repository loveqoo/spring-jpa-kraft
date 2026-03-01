lexer grammar MySQLLexer;

options {
    superClass = MySQLLexerBase;
}

// DDL keywords
CREATE: C R E A T E;
TABLE: T A B L E;
IF: I F;
NOT: N O T;
EXISTS: E X I S T S;

// Constraint / index keywords
PRIMARY: P R I M A R Y;
KEY: K E Y;
UNIQUE: U N I Q U E;
INDEX: I N D E X;
FOREIGN: F O R E I G N;
REFERENCES: R E F E R E N C E S;
CHECK_: C H E C K;
CONSTRAINT: C O N S T R A I N T;

// Column attribute keywords
NULL_: N U L L;
DEFAULT: D E F A U L T;
AUTO_INCREMENT: A U T O '_' I N C R E M E N T;
COMMENT_: C O M M E N T;

// Sort direction / index option keywords
ASC: A S C;
DESC: D E S C;
USING: U S I N G;

// Punctuation
SEMI: ';';
LPAREN: '(';
RPAREN: ')';
COMMA: ',';
DOT: '.';
EQ: '=';

// Identifiers and literals (must come after keywords)
BACKTICK_ID: '`' (~'`')+ '`';
IDENTIFIER: [a-zA-Z_] [a-zA-Z_0-9$]*;
NUMBER: [0-9]+;
STRING_LITERAL: '\'' ( '\'\'' | ~'\'' )* '\'';
DOUBLE_QUOTED_STRING: '"' (~'"')* '"';

// Skip
LINE_COMMENT: '--' ~[\r\n]* -> skip;
HASH_COMMENT: '#' ~[\r\n]* -> skip;
BLOCK_COMMENT: '/*' .*? '*/' -> skip;
WS: [ \t\r\n]+ -> skip;

OTHER: .;

fragment A: [aA];
fragment B: [bB];
fragment C: [cC];
fragment D: [dD];
fragment E: [eE];
fragment F: [fF];
fragment G: [gG];
fragment H: [hH];
fragment I: [iI];
fragment J: [jJ];
fragment K: [kK];
fragment L: [lL];
fragment M: [mM];
fragment N: [nN];
fragment O: [oO];
fragment P: [pP];
fragment Q: [qQ];
fragment R: [rR];
fragment S: [sS];
fragment T: [tT];
fragment U: [uU];
fragment V: [vV];
fragment W: [wW];
fragment X: [xX];
fragment Y: [yY];
fragment Z: [zZ];
