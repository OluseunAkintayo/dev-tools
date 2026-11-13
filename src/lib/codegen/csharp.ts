import type { FieldDecl, Model, TypeDecl, TypeRef } from "./model";
import type { NamingRules } from "./naming";
import type { CodeOptions, EmitResult, LanguageSpec } from "./types";

const KEYWORDS = new Set(
  "abstract as base bool break byte case catch char checked class const continue decimal default delegate do double else enum event explicit extern false finally fixed float for foreach goto if implicit in int interface internal is lock long namespace new null object operator out override params private protected public readonly ref return sbyte sealed short sizeof stackalloc static string struct switch this throw true try typeof uint ulong unchecked unsafe ushort using virtual void volatile while".split(" ")
);

// Members every object has, plus the ones the compiler adds to records.
const OBJECT_MEMBERS = new Set("Equals GetHashCode GetType ToString Finalize MemberwiseClone ReferenceEquals EqualityContract PrintMembers Clone".split(" "));
export const csharpRules: NamingRules = {
  autoStyle: "pascal",
  cleanStyle: "pascal",
  isValid: /^[A-Za-z_]\w*$/,
  // A property X also claims the accessor names get_X and set_X.
  reserved: { has: (name) => KEYWORDS.has(name) || OBJECT_MEMBERS.has(name) || /^[gs]et_/.test(name) },
  escape: (name) => (KEYWORDS.has(name) ? `@${name}` : `${name}Value`),
  digitPrefix: "_",
  upperFirst: false,
  avoidTypeName: true,
  reservedTypes: new Set(["Dictionary", "JsonPropertyName", "JsonPropertyNameAttribute", "List"]),
};

const typeOf = (ref: TypeRef): string => {
  switch (ref.kind) {
    case "string":
      return "string";
    case "boolean":
      return "bool";
    case "int":
      return "int";
    case "long":
      return "long";
    case "double":
      return "double";
    case "null":
      return "object?";
    case "any":
    case "union":
      return "object";
    case "map":
      return "Dictionary<string, object>";
    case "list":
      return `List<${typeOf(ref.item)}>`;
    case "object":
      return ref.decl.name;
    case "nullable": {
      const inner = typeOf(ref.inner);
      return inner.endsWith("?") ? inner : `${inner}?`;
    }
  }
};

/** A field that may be missing is nullable too. */
const fieldType = (field: FieldDecl) => {
  const type = typeOf(field.type);
  return field.optional && !type.endsWith("?") ? `${type}?` : type;
};

/**
 * A non-null reference type needs a value, or every property raises a nullable warning
 * (CS8618) in a project with nullable reference types enabled, which is the default.
 */
const initialiser = (field: FieldDecl) => {
  if (fieldType(field).endsWith("?")) return "";
  switch (field.type.kind) {
    case "string":
      return " = string.Empty;";
    case "list":
    case "map":
    case "object":
      return " = new();";
    case "any":
    case "union":
      return " = default!;";
    default:
      return "";
  }
};

const attribute = (field: FieldDecl) => (field.name === field.key ? null : `JsonPropertyName(${JSON.stringify(field.key)})`);

const asClass = (decl: TypeDecl) => {
  if (!decl.fields.length) return `public class ${decl.name}\n{\n}`;
  const attributed = decl.fields.some((field) => attribute(field));
  const members = decl.fields.map((field) => {
    const attr = attribute(field);
    return `${attr ? `    [${attr}]\n` : ""}    public ${fieldType(field)} ${field.name} { get; set; }${initialiser(field)}`;
  });
  return `public class ${decl.name}\n{\n${members.join(attributed ? "\n\n" : "\n")}\n}`;
};

const asRecord = (decl: TypeDecl) => {
  if (!decl.fields.length) return `public record ${decl.name}();`;
  const parameters = decl.fields.map((field) => {
    const attr = attribute(field);
    return `    ${attr ? `[property: ${attr}] ` : ""}${fieldType(field)} ${field.name}`;
  });
  return `public record ${decl.name}(\n${parameters.join(",\n")});`;
};

const emit = (model: Model, options: CodeOptions): EmitResult => {
  const body = model.types.map(options.csharpKind === "record" ? asRecord : asClass).join("\n\n");
  const usings = [
    /List<|Dictionary</.test(body) && "using System.Collections.Generic;",
    /\[(?:property: )?JsonPropertyName\(/.test(body) && "using System.Text.Json.Serialization;",
  ].filter(Boolean);
  const header = ["#nullable enable", ...(usings.length ? ["", ...usings] : [])].join("\n");
  const notes = model.rootIsList ? ["The JSON is an array, so these types describe each item. Deserialize it as List<" + (model.root.kind === "object" ? model.root.decl.name : "T") + ">."] : [];
  return { code: `${header}\n\n${body}\n`, warnings: [], notes };
};

export const csharp: LanguageSpec = {
  id: "csharp",
  label: "C#",
  extension: ".cs",
  highlight: "csharp",
  library: "System.Text.Json",
  rules: csharpRules,
  needsObjectRoot: true,
  fileName: (typeName) => `${typeName}.cs`,
  emit,
};
