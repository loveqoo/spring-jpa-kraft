import { z } from 'zod';

/** Schema for SimpleSchemaResponse — initial schema generation */
export const simpleSchemaResponseSchema = z.object({
  tables: z.array(z.object({
    name: z.string(),
    columns: z.array(z.string()),
  })),
  relationships: z.array(z.object({
    parent: z.string(),
    child: z.string(),
  })).default([]),
  basePackage: z.string().optional(),
});

/** Schema for DeltaResponse — designer modification */
export const deltaResponseSchema = z.object({
  add_tables: z.array(z.object({
    name: z.string(),
    columns: z.array(z.string()),
  })).optional(),
  remove_tables: z.array(z.string()).optional(),
  add_columns: z.array(z.object({
    table: z.string(),
    columns: z.array(z.string()),
  })).optional(),
  remove_columns: z.array(z.object({
    table: z.string(),
    columns: z.array(z.string()),
  })).optional(),
  add_relationships: z.array(z.object({
    parent: z.string(),
    child: z.string(),
  })).optional(),
  remove_relationships: z.array(z.object({
    parent: z.string(),
    child: z.string(),
  })).optional(),
});

/** Schema for table modification response */
export const tableModResponseSchema = z.object({
  columns: z.array(z.object({
    name: z.string(),
    typeName: z.string(),
    typeValue: z.number().nullable().default(null),
    primaryKey: z.boolean().default(false),
    notNull: z.boolean().default(false),
    unique: z.boolean().default(false),
    autoIncrement: z.boolean().default(false),
    defaultValue: z.string().nullable().default(null),
    note: z.string().nullable().default(null),
  })),
  indexes: z.array(z.object({
    name: z.string(),
    columns: z.array(z.string()),
    unique: z.boolean().default(false),
    primaryKey: z.boolean().default(false),
  })).default([]),
});
