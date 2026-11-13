import { apartFromTypes, type FieldDecl, type Model, type TypeDecl, type TypeRef } from "./model";
import type { NamingRules } from "./naming";
import { stringLiteral } from "./strings";
import type { EmitResult, LanguageSpec } from "./types";

const KEYWORDS = new Set(
  // Reserved words, plus members every object has that a field must not replace.
  "assert break case catch class const continue default do else enum extends false final finally for if in is new null rethrow return super switch this throw true try var void while with await yield hashCode runtimeType toString toJson noSuchMethod".split(" ")
);

const DART_TYPES: ReadonlySet<string> = new Set(["BigInt", "Comparable", "DateTime", "Duration", "Enum", "Error", "Exception", "Function", "Future", "Iterable", "List", "Map", "Never", "Null", "Object", "Record", "RegExp", "Set", "Stream", "String", "Symbol", "Type", "Uri", "bool", "double", "dynamic", "int", "num"]);

export const dartRules: NamingRules = {
  autoStyle: "camel",
  cleanStyle: "camel",
  isValid: /^[A-Za-z_]\w*$/,
  // A field called String or List would hide that type from the rest of the class.
  reserved: { has: (name) => KEYWORDS.has(name) || DART_TYPES.has(name) || name.startsWith("_") },
  // A leading underscore makes a member private, and a private name can't be a named parameter.
  escape: (name) => `${name.replace(/^_+/, "") || "field"}_`,
  asciiOnly: true,
  digitPrefix: "n",
  upperFirst: false,
  avoidTypeName: false,
  reservedTypes: DART_TYPES,
};

const dartString = (text: string) => stringLiteral(text, "'", true);

const typeOf = (ref: TypeRef): string => {
  switch (ref.kind) {
    case "string":
      return "String";
    case "boolean":
      return "bool";
    case "int":
    case "long":
      return "int";
    case "double":
      return "double";
    case "null":
    case "any":
    case "union":
      return "dynamic";
    case "map":
      return "Map<String, dynamic>";
    case "list":
      return `List<${typeOf(ref.item)}>`;
    case "object":
      return ref.decl.name;
    case "nullable": {
      const inner = typeOf(ref.inner);
      return inner === "dynamic" ? inner : `${inner}?`;
    }
  }
};

/** Reads a value out of decoded JSON (`dynamic`), casting it to the field's type. */
const fromJson = (ref: TypeRef, source: string, nullable = false): string => {
  const q = nullable ? "?" : "";
  switch (ref.kind) {
    case "string":
    case "boolean":
    case "int":
    case "long":
      return `${source} as ${typeOf(ref)}${q}`;
    case "double":
      // A JSON number without a fraction is decoded as an int.
      return nullable ? `(${source} as num?)?.toDouble()` : `(${source} as num).toDouble()`;
    case "null":
    case "any":
    case "union":
      return source;
    case "map":
      return `${source} as Map<String, dynamic>${q}`;
    case "list":
      return `(${source} as List<dynamic>${q})${q}.map((e) => ${fromJson(ref.item, "e")}).toList()`;
    case "object":
      return nullable ? `${source} == null ? null : ${ref.decl.name}.fromJson(${source} as Map<String, dynamic>)` : `${ref.decl.name}.fromJson(${source} as Map<String, dynamic>)`;
    case "nullable":
      return fromJson(ref.inner, source, true);
  }
};

/** Whether a value has to be converted to be written as JSON. */
const needsToJson = (ref: TypeRef): boolean => ref.kind === "object" || (ref.kind === "list" && needsToJson(ref.item)) || (ref.kind === "nullable" && needsToJson(ref.inner));

const toJson = (ref: TypeRef, source: string, nullable = false): string => {
  const q = nullable ? "?" : "";
  switch (ref.kind) {
    case "object":
      return `${source}${q}.toJson()`;
    case "list":
      return needsToJson(ref.item) ? `${source}${q}.map((e) => ${toJson(ref.item, "e")}).toList()` : source;
    case "nullable":
      return toJson(ref.inner, source, true);
    default:
      return source;
  }
};

const isNullable = (field: FieldDecl) => field.optional || field.type.kind === "nullable" || field.type.kind === "null";

const declare = (decl: TypeDecl) => {
  if (!decl.fields.length) {
    return `class ${decl.name} {\n  const ${decl.name}();\n\n  factory ${decl.name}.fromJson(Map<String, dynamic> json) => const ${decl.name}();\n\n  Map<String, dynamic> toJson() => {};\n}`;
  }
  const fields = decl.fields.map((field) => {
    const type = typeOf(field.type);
    return `  final ${isNullable(field) && type !== "dynamic" && !type.endsWith("?") ? `${type}?` : type} ${field.name};`;
  });
  const params = decl.fields.map((field) => `    ${isNullable(field) ? "" : "required "}this.${field.name},`);
  const reads = decl.fields.map((field) => {
    return `        ${field.name}: ${fromJson(field.type, `json[${dartString(field.key)}]`, isNullable(field))},`;
  });
  const writes = decl.fields.map((field) => {
    const key = dartString(field.key);
    const value = toJson(field.type, field.name, isNullable(field) && field.type.kind !== "nullable");
    // A key missing from some of the sample's objects is left out again.
    return field.optional ? `        if (${field.name} != null) ${key}: ${value},` : `        ${key}: ${value},`;
  });
  return [
    `class ${decl.name} {`,
    ...fields,
    "",
    `  const ${decl.name}({`,
    ...params,
    "  });",
    "",
    `  factory ${decl.name}.fromJson(Map<String, dynamic> json) => ${decl.name}(`,
    ...reads,
    "      );",
    "",
    "  Map<String, dynamic> toJson() => {",
    ...writes,
    "      };",
    "}",
  ].join("\n");
};

const emit = (model: Model): EmitResult => {
  const body = apartFromTypes(model.types).map(declare).join("\n\n");
  const notes = model.rootIsList && model.root.kind === "object" ? [`The JSON is an array, so these classes describe each item. Map it with ${model.root.decl.name}.fromJson.`] : [];
  return { code: `${body}\n`, warnings: [], notes };
};

export const dart: LanguageSpec = {
  id: "dart",
  label: "Dart",
  extension: ".dart",
  highlight: "dart",
  library: "fromJson / toJson",
  rules: dartRules,
  needsObjectRoot: true,
  // Dart files are snake_case.
  fileName: (typeName) => `${typeName.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase() || "model"}.dart`,
  emit,
};
