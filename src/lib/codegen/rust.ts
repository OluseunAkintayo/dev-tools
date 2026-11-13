import type { FieldDecl, Model, TypeDecl, TypeRef } from "./model";
import { splitWords, type NamingRules } from "./naming";
import { stringLiteral } from "./strings";
import type { EmitResult, LanguageSpec } from "./types";

const KEYWORDS = new Set(
  "as break const continue crate else enum extern false fn for if impl in let loop match mod move mut pub ref return self Self static struct super trait true type unsafe use where while async await dyn abstract become box do final macro override priv typeof unsized virtual yield try gen _".split(" ")
);

// These can't be raw identifiers (r#self), so they get an underscore instead.
const NOT_RAW = new Set(["crate", "self", "Self", "super", "_"]);

export const rustRules: NamingRules = {
  autoStyle: "snake",
  cleanStyle: "snake",
  isValid: /^[A-Za-z_]\w*$/,
  reserved: KEYWORDS,
  escape: (name) => (NOT_RAW.has(name) ? `${name}_` : `r#${name}`),
  digitPrefix: "_",
  upperFirst: false,
  avoidTypeName: false,
  reservedTypes: new Set(["Box", "Clone", "Debug", "Deserialize", "HashMap", "Option", "Result", "Self", "Serialize", "String", "Value", "Vec"]),
};

const typeOf = (ref: TypeRef): string => {
  switch (ref.kind) {
    case "string":
      return "String";
    case "boolean":
      return "bool";
    case "int":
      return "i32";
    case "long":
      return "i64";
    case "double":
      return "f64";
    case "null":
      return "Option<Value>";
    case "any":
    case "union":
      return "Value";
    case "map":
      return "HashMap<String, Value>";
    case "list":
      return `Vec<${typeOf(ref.item)}>`;
    case "object":
      return ref.decl.name;
    case "nullable": {
      const inner = typeOf(ref.inner);
      return inner.startsWith("Option<") ? inner : `Option<${inner}>`;
    }
  }
};

/** serde drops the r# itself, so a raw identifier still matches its key. */
const plainName = (name: string) => name.replace(/^r#/, "");

const declare = (decl: TypeDecl) => {
  const derive = "#[derive(Debug, Clone, Serialize, Deserialize)]";
  if (!decl.fields.length) return `${derive}\npub struct ${decl.name} {}`;
  const lines = decl.fields.flatMap((field: FieldDecl) => {
    let type = typeOf(field.type);
    // A key missing from the sample is None, and is left out again when written.
    const skip = field.optional && !type.startsWith("Option<");
    if (skip) type = `Option<${type}>`;
    const attributes: string[] = [];
    if (plainName(field.name) !== field.key) attributes.push(`rename = ${stringLiteral(field.key)}`);
    if (field.optional) attributes.push('skip_serializing_if = "Option::is_none"');
    return [...(attributes.length ? [`    #[serde(${attributes.join(", ")})]`] : []), `    pub ${field.name}: ${type},`];
  });
  // Rust lints for snake_case, which fields kept as in the JSON are not.
  const lint = decl.fields.some((field) => /[A-Z]/.test(plainName(field.name))) ? "#[allow(non_snake_case)]\n" : "";
  return `${lint}${derive}\npub struct ${decl.name} {\n${lines.join("\n")}\n}`;
};

const emit = (model: Model): EmitResult => {
  const body = model.types.map(declare).join("\n\n");
  const uses = [
    /\bHashMap</.test(body) && "use std::collections::HashMap;",
    "use serde::{Deserialize, Serialize};",
    /\bValue\b/.test(body) && "use serde_json::Value;",
  ].filter(Boolean);
  const notes = model.rootIsList && model.root.kind === "object" ? [`The JSON is an array, so these types describe each item. Deserialize it as Vec<${model.root.decl.name}>.`] : [];
  return { code: `${uses.join("\n")}\n\n${body}\n`, warnings: [], notes };
};

export const rust: LanguageSpec = {
  id: "rust",
  label: "Rust",
  extension: ".rs",
  highlight: "rust",
  library: "serde",
  rules: rustRules,
  needsObjectRoot: true,
  // Rust modules are snake_case.
  fileName: (typeName) => `${splitWords(typeName).join("_").toLowerCase() || "model"}.rs`,
  emit,
};
