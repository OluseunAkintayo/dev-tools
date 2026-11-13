import { apartFromTypes, type FieldDecl, type Model, type TypeDecl, type TypeRef } from "./model";
import type { NamingRules } from "./naming";
import { stringLiteral } from "./strings";
import type { EmitResult, LanguageSpec } from "./types";

const KEYWORDS = new Set(
  "associatedtype class deinit enum extension fileprivate func import init inout internal let open operator private precedencegroup protocol public rethrows static struct subscript typealias var break case catch continue default defer do else fallthrough for guard if in repeat return throw switch where while Any as await false is nil self Self super throws true try Type _".split(" ")
);

// These can't be written in backticks as a property name, so they get an underscore instead.
const UNQUOTABLE = new Set(["self", "Self", "init", "Type", "Protocol", "_"]);

const SWIFT_TYPES: ReadonlySet<string> = new Set(["Any", "Array", "Bool", "Character", "Codable", "CodingKey", "CodingKeys", "Decodable", "Decoder", "Dictionary", "Double", "Encodable", "Encoder", "Error", "Int", "Int64", "JSONValue", "Never", "Optional", "Result", "Self", "Set", "String", "Type", "Void"]);

export const swiftRules: NamingRules = {
  autoStyle: "camel",
  cleanStyle: "camel",
  isValid: /^[A-Za-z_]\w*$/,
  // A property called String or Int would hide that type from the rest of the struct.
  reserved: { has: (name) => KEYWORDS.has(name) || SWIFT_TYPES.has(name) },
  escape: (name) => (KEYWORDS.has(name) && !UNQUOTABLE.has(name) ? `\`${name}\`` : `${name}_`),
  digitPrefix: "_",
  upperFirst: false,
  avoidTypeName: false,
  reservedTypes: SWIFT_TYPES,
};

const typeOf = (ref: TypeRef): string => {
  switch (ref.kind) {
    case "string":
      return "String";
    case "boolean":
      return "Bool";
    case "int":
      return "Int";
    case "long":
      return "Int64";
    case "double":
      return "Double";
    case "null":
      return "JSONValue?";
    case "any":
    case "union":
      return "JSONValue";
    case "map":
      return "[String: JSONValue]";
    case "list":
      return `[${typeOf(ref.item)}]`;
    case "object":
      return ref.decl.name;
    case "nullable": {
      const inner = typeOf(ref.inner);
      return inner.endsWith("?") ? inner : `${inner}?`;
    }
  }
};

const isNullable = (field: FieldDecl) => field.optional || field.type.kind === "nullable" || field.type.kind === "null";

const declare = (decl: TypeDecl) => {
  if (!decl.fields.length) return `struct ${decl.name}: Codable {}`;
  const properties = decl.fields.map((field) => {
    const type = typeOf(field.type);
    // An optional property is decoded from a missing key or a null.
    return `    let ${field.name}: ${isNullable(field) && !type.endsWith("?") ? `${type}?` : type}`;
  });
  // CodingKeys has to list every property as soon as one of them is renamed.
  const renamed = decl.fields.some((field) => field.name !== field.key);
  const keys = renamed
    ? [
        "",
        "    enum CodingKeys: String, CodingKey {",
        ...decl.fields.map((field) => (field.name === field.key ? `        case ${field.name}` : `        case ${field.name} = ${stringLiteral(field.key)}`)),
        "    }",
      ]
    : [];
  return `struct ${decl.name}: Codable {\n${[...properties, ...keys].join("\n")}\n}`;
};

/** Swift has no type for "any JSON", so one is added when the sample needs it. */
const JSON_VALUE = `enum JSONValue: Codable {
    case null
    case bool(Bool)
    case number(Double)
    case string(String)
    case array([JSONValue])
    case object([String: JSONValue])

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else {
            self = .object(try container.decode([String: JSONValue].self))
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case .null: try container.encodeNil()
        case .bool(let value): try container.encode(value)
        case .number(let value): try container.encode(value)
        case .string(let value): try container.encode(value)
        case .array(let value): try container.encode(value)
        case .object(let value): try container.encode(value)
        }
    }
}`;

const emit = (model: Model): EmitResult => {
  const body = apartFromTypes(model.types).map(declare).join("\n\n");
  const needsValue = /\bJSONValue\b/.test(body);
  const notes = model.rootIsList && model.root.kind === "object" ? [`The JSON is an array, so these types describe each item. Decode it as [${model.root.decl.name}].`] : [];
  return { code: `${body}\n${needsValue ? `\n${JSON_VALUE}\n` : ""}`, warnings: [], notes };
};

export const swift: LanguageSpec = {
  id: "swift",
  label: "Swift",
  extension: ".swift",
  highlight: "swift",
  library: "Codable",
  rules: swiftRules,
  needsObjectRoot: true,
  fileName: (typeName) => `${typeName}.swift`,
  emit,
};
