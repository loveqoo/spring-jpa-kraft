package spring.kraft.ddl.parser;

import java.util.Collections;
import java.util.EnumSet;
import java.util.Set;

public final class SqlModes {
    private SqlModes() {}

    public static Set<SqlMode> empty() {
        return Collections.unmodifiableSet(EnumSet.noneOf(SqlMode.class));
    }
}
