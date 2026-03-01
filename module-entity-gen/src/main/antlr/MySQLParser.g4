parser grammar MySQLParser;

options {
    tokenVocab = MySQLLexer;
    superClass = MySQLParserBase;
}

sqlStatements
    : statement* EOF
    ;

statement
    : createTableStatement
    | otherStatement
    ;

// ─── CREATE TABLE ─────────────────────────────────────────────────────────────

createTableStatement
    : CREATE TABLE ifNotExists? tableName
      LPAREN tableElement (COMMA tableElement)* RPAREN
      tableOption* SEMI?
    ;

ifNotExists
    : IF NOT EXISTS
    ;

tableName
    : identifier (DOT identifier)?
    ;

// ─── Table elements (columns + constraints) ──────────────────────────────────

tableElement
    : primaryKeyConstraint
    | uniqueConstraint
    | indexDefinition
    | foreignKeyConstraint
    | checkConstraint
    | constraintWithName
    | columnDefinition
    ;

// ─── Column definition ───────────────────────────────────────────────────────

columnDefinition
    : identifier dataType columnAttribute*
    ;

dataType
    : typeName (LPAREN dataTypeParam (COMMA dataTypeParam)* RPAREN)?
    ;

typeName
    : IDENTIFIER
    ;

dataTypeParam
    : NUMBER
    | STRING_LITERAL
    | identifier
    ;

columnAttribute
    : NOT NULL_                    # notNullAttr
    | NULL_                        # nullableAttr
    | PRIMARY KEY                  # primaryKeyAttr
    | UNIQUE KEY?                  # uniqueAttr
    | AUTO_INCREMENT               # autoIncrementAttr
    | DEFAULT defaultValue         # defaultAttr
    | COMMENT_ STRING_LITERAL      # commentAttr
    | REFERENCES referenceTarget   # columnRefAttr
    | columnAttrToken              # unknownAttr
    ;

defaultValue
    : STRING_LITERAL
    | DOUBLE_QUOTED_STRING
    | NUMBER
    | NULL_
    | IDENTIFIER LPAREN defaultInner RPAREN
    | IDENTIFIER
    | LPAREN defaultInner RPAREN
    ;

defaultInner
    : ( ~RPAREN | LPAREN defaultInner RPAREN )*
    ;

columnAttrToken
    : ~( COMMA | RPAREN | NOT | NULL_ | PRIMARY | KEY | UNIQUE
       | AUTO_INCREMENT | DEFAULT | COMMENT_ | REFERENCES | SEMI
       | ASC | DESC | USING )
    | LPAREN columnInner RPAREN
    ;

columnInner
    : ( ~RPAREN | LPAREN columnInner RPAREN )*
    ;

// ─── Table-level constraints ─────────────────────────────────────────────────

primaryKeyConstraint
    : PRIMARY KEY indexColumns indexOption*
    ;

uniqueConstraint
    : UNIQUE (KEY | INDEX)? identifier? indexColumns indexOption*
    ;

indexDefinition
    : (KEY | INDEX) identifier? indexColumns indexOption*
    ;

foreignKeyConstraint
    : FOREIGN KEY identifier? indexColumns REFERENCES referenceTarget
    ;

checkConstraint
    : CHECK_ LPAREN checkInner RPAREN
    ;

constraintWithName
    : CONSTRAINT identifier? constraintBody
    ;

constraintBody
    : PRIMARY KEY indexColumns indexOption*                               # constraintPK
    | UNIQUE (KEY | INDEX)? identifier? indexColumns indexOption*         # constraintUnique
    | FOREIGN KEY identifier? indexColumns REFERENCES referenceTarget     # constraintFK
    | CHECK_ LPAREN checkInner RPAREN                                    # constraintCheck
    ;

// ─── Index columns ───────────────────────────────────────────────────────────

indexColumns
    : LPAREN indexColumn (COMMA indexColumn)* RPAREN
    ;

indexColumn
    : identifier (LPAREN NUMBER RPAREN)? sortDirection?
    ;

sortDirection
    : ASC
    | DESC
    ;

indexOption
    : USING identifier
    | COMMENT_ STRING_LITERAL
    | identifier  // KEY_BLOCK_SIZE, PARSER 등 기타 옵션 키워드
    | EQ
    | NUMBER
    ;

// ─── Reference / check helpers (consume until boundary) ──────────────────────

referenceTarget
    : referenceToken+
    ;

referenceToken
    : ~( COMMA | RPAREN | SEMI )
    | LPAREN referenceInner RPAREN
    ;

referenceInner
    : ( ~RPAREN | LPAREN referenceInner RPAREN )*
    ;

checkInner
    : ( ~RPAREN | LPAREN checkInner RPAREN )*
    ;

// ─── Table options (ENGINE=InnoDB etc.) ──────────────────────────────────────

tableOption
    : ~( SEMI | CREATE )
    | CREATE ~TABLE
    ;

// ─── Non-CREATE TABLE statements ─────────────────────────────────────────────

otherStatement
    : otherToken+ SEMI?
    ;

otherToken
    : ~( SEMI | CREATE )
    | CREATE ~TABLE
    ;

// ─── Identifier (allows backtick-quoted names) ──────────────────────────────

identifier
    : IDENTIFIER
    | BACKTICK_ID
    ;
