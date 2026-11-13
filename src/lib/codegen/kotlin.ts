import type { FieldDecl, Model, TypeDecl, TypeRef } from "./model";
import type { NamingRules } from "./naming";
import type { EmitResult, LanguageSpec } from "./types";

// Kotlin's hard keywords; soft keywords such as `value` and `data` are fine as property names.
const KEYWORDS = new Set(
  "as break class continue do else false for fun if in interface is null object package return super this throw true try typealias typeof val var when while".split(" ")
);

export const kotlinRules: NamingRules = {
  autoStyle: "camel",
  cleanStyle: "camel",
  isValid: /^[A-Za-z_]\w*$/,
  reserved: KEYWORDS,
  escape: (name) => `\`${name}\``,
  digitPrefix: "_",
  upperFirst: false,
  avoidTypeName: false,
  reservedTypes: new Set(["Any", "Array", "Boolean", "Double", "Int", "JsonElement", "List", "Long", "Map", "Nothing", "SerialName", "Serializable", "String", "Unit"]),
};

const typeOf = (ref: TypeRef): string => {
  switch (ref.kind) {
    case "string":
      return "String";
    case "boolean":
      return "Boolean";
    case "int":
      return "Int";
    case "long":
      return "Long";
    case "double":
      return "Double";
    case "null":
      return "JsonElement?";
    case "any":
    case "union":
      return "JsonElement";
    case "map":
      return "Map<String, JsonElement>";
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

const isNullable = (field: FieldDecl) => field.optional || field.type.kind === "nullable" || field.type.kind === "null";

const declare = (decl: TypeDecl) => {
  // A data class needs at least one property.
  if (!decl.fields.length) return `@Serializable\nclass ${decl.name}`;
  const properties = decl.fields.map((field) => {
    const type = typeOf(field.type);
    const nullable = isNullable(field);
    // Nullable and missing values default to null, so a payload may leave them out.
    const declared = nullable && !type.endsWith("?") ? `${type}?` : type;
    const annotation = field.name === field.key ? "" : `@SerialName(${JSON.stringify(field.key).replace(/\$/g, "\\$")}) `;
    return `    ${annotation}val ${field.name}: ${declared}${nullable ? " = null" : ""},`;
  });
  return `@Serializable\ndata class ${decl.name}(\n${properties.join("\n")}\n)`;
};

const emit = (model: Model): EmitResult => {
  const body = model.types.map(declare).join("\n\n");
  const imports = [
    /@SerialName/.test(body) && "import kotlinx.serialization.SerialName",
    "import kotlinx.serialization.Serializable",
    /JsonElement/.test(body) && "import kotlinx.serialization.json.JsonElement",
  ].filter(Boolean);
  const notes = model.rootIsList && model.root.kind === "object" ? [`The JSON is an array, so these types describe each item. Decode it as List<${model.root.decl.name}>.`] : [];
  return { code: `${imports.join("\n")}\n\n${body}\n`, warnings: [], notes };
};

export const kotlin: LanguageSpec = {
  id: "kotlin",
  label: "Kotlin",
  extension: ".kt",
  highlight: "kotlin",
  library: "kotlinx.serialization",
  rules: kotlinRules,
  needsObjectRoot: true,
  fileName: (typeName) => `${typeName}.kt`,
  emit,
};
