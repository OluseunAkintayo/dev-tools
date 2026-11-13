import type { FieldDecl, Model, TypeDecl, TypeRef } from "./model";
import { splitWords, type NamingRules } from "./naming";
import type { EmitResult, LanguageSpec } from "./types";

export const goRules: NamingRules = {
  autoStyle: "pascal",
  cleanStyle: "pascal",
  isValid: /^[A-Za-z_]\w*$/,
  // Exported names start with a capital, and every Go keyword is lower case.
  reserved: new Set<string>(),
  escape: (name) => name,
  digitPrefix: "Field",
  upperFirst: true,
  avoidTypeName: false,
  reservedTypes: new Set<string>(),
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
      return "int64";
    case "double":
      return "float64";
    case "null":
    case "any":
    case "union":
      return "any";
    case "map":
      return "map[string]any";
    case "list":
      return `[]${typeOf(ref.item)}`;
    case "object":
      return ref.decl.name;
    case "nullable":
      return pointerTo(typeOf(ref.inner));
  }
};

/** Slices, maps and interfaces are already nil-able; everything else needs a pointer to hold null. */
const pointerTo = (type: string) => (/^(\[\]|map\[|\*|any$)/.test(type) ? type : `*${type}`);

/** The rule encoding/json uses to accept a name in a struct tag. */
const isValidTagName = (key: string) => key !== "" && [...key].every((char) => "!#$%&()*+-./:;<=>?@[]^_{|}~ ".includes(char) || /[\p{L}\p{N}]/u.test(char));

const fieldType = (field: FieldDecl) => (field.optional && field.type.kind !== "nullable" ? pointerTo(typeOf(field.type)) : typeOf(field.type));

const declare = (decl: TypeDecl, warnings: string[]) => {
  if (!decl.fields.length) return `type ${decl.name} struct{}`;
  const rows = decl.fields.map((field) => {
    let tag = "";
    if (isValidTagName(field.key)) {
      tag = `\`json:"${field.key}${field.optional ? ",omitempty" : ""}"\``;
    } else {
      warnings.push(`The key ${JSON.stringify(field.key)} can't be written in a Go struct tag, so ${decl.name}.${field.name} won't be filled from it.`);
    }
    return { name: field.name, type: fieldType(field), tag };
  });
  const nameWidth = Math.max(...rows.map((row) => row.name.length));
  const typeWidth = Math.max(...rows.map((row) => row.type.length));
  const lines = rows.map((row) => `\t${row.name.padEnd(nameWidth)} ${row.tag ? row.type.padEnd(typeWidth) : row.type} ${row.tag}`.trimEnd());
  return `type ${decl.name} struct {\n${lines.join("\n")}\n}`;
};

const emit = (model: Model): EmitResult => {
  const warnings: string[] = [];
  const body = model.types.map((decl) => declare(decl, warnings)).join("\n\n");
  const notes = ["Go only fills fields that start with a capital letter, so every field name does."];
  if (model.rootIsList && model.root.kind === "object") notes.push(`The JSON is an array, so these types describe each item. Unmarshal it into []${model.root.decl.name}.`);
  return { code: `package main\n\n${body}\n`, warnings, notes };
};

export const go: LanguageSpec = {
  id: "go",
  label: "Go",
  extension: ".go",
  highlight: "go",
  library: "encoding/json",
  rules: goRules,
  needsObjectRoot: true,
  // Go files are conventionally lower_snake_case.
  fileName: (typeName) => `${splitWords(typeName).join("_").toLowerCase() || "model"}.go`,
  emit,
};
