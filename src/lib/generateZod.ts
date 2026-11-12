import { formatKey, inferShape, toTypeName, type Shape, type StringFormat } from "@/lib/inferShape";

export type ZodVersion = "4" | "3";

export interface ZodOptions {
  name: string;
  version: ZodVersion;
  /** Reject unknown keys (z.strictObject in v4, .strict() in v3). */
  strict: boolean;
  /** Use z.email(), z.url() and similar when every sample value has that format. */
  formats: boolean;
  /** Add `export type X = z.infer<typeof XSchema>`. */
  inferType: boolean;
}

const INDENT = "  ";

const FORMAT_V4: Record<StringFormat, string> = {
  email: "z.email()",
  url: "z.url()",
  uuid: "z.uuid()",
  datetime: "z.iso.datetime({ offset: true })",
  date: "z.iso.date()",
};

const FORMAT_V3: Record<StringFormat, string> = {
  email: "z.string().email()",
  url: "z.string().url()",
  uuid: "z.string().uuid()",
  datetime: "z.string().datetime({ offset: true })",
  date: "z.string().date()",
};

const schemaFor = (shape: Shape, depth: number, options: ZodOptions): string => {
  switch (shape.kind) {
    case "string":
      return shape.format && options.formats ? (options.version === "4" ? FORMAT_V4 : FORMAT_V3)[shape.format] : "z.string()";
    case "number":
      return "z.number()";
    case "boolean":
      return "z.boolean()";
    case "null":
      return "z.null()";
    case "unknown":
      return "z.unknown()";
    case "array":
      return `z.array(${schemaFor(shape.item, depth, options)})`;
    case "union": {
      // "X or null" reads better as X.nullable() than as a two-member union.
      const nonNull = shape.options.filter((option) => option.kind !== "null");
      const nullable = nonNull.length < shape.options.length;
      const inner = nonNull.length === 1 ? schemaFor(nonNull[0], depth, options) : `z.union([${nonNull.map((option) => schemaFor(option, depth, options)).join(", ")}])`;
      return nullable ? `${inner}.nullable()` : inner;
    }
    case "object": {
      if (shape.fields.length === 0) return "z.record(z.string(), z.unknown())";
      const pad = INDENT.repeat(depth + 1);
      const lines = shape.fields.map((field) => `${pad}${formatKey(field.key)}: ${schemaFor(field.shape, depth + 1, options)}${field.optional ? ".optional()" : ""},`);
      const body = `{\n${lines.join("\n")}\n${INDENT.repeat(depth)}}`;
      if (!options.strict) return `z.object(${body})`;
      return options.version === "4" ? `z.strictObject(${body})` : `z.object(${body}).strict()`;
    }
  }
};

/** A Zod schema module for a JSON sample. Arrays merge all their items. */
export const generateZod = (data: unknown, options: ZodOptions): string => {
  const typeName = toTypeName(options.name);
  if (!typeName) throw new Error("The schema name must contain at least one letter.");
  const schemaName = `${typeName}Schema`;
  const lines = ['import { z } from "zod";', "", `export const ${schemaName} = ${schemaFor(inferShape(data), 0, options)};`];
  if (options.inferType) lines.push("", `export type ${typeName} = z.infer<typeof ${schemaName}>;`);
  return `${lines.join("\n")}\n`;
};
