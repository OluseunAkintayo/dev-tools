import type { FieldDecl, Model, TypeDecl, TypeRef } from "./model";
import { splitWords, uniqueName, type NamingRules } from "./naming";
import type { EmitResult, LanguageSpec } from "./types";

const KEYWORDS = new Set(
  "False None True and as assert async await break class continue def del elif else except finally for from global if import in is lambda nonlocal not or pass raise return try while with yield".split(" ")
);
// Names pydantic's BaseModel already has; a field with one of these shadows it.
const BASE_MODEL_ATTRIBUTES = new Set(
  "copy dict json schema schema_json construct validate parse_obj parse_raw parse_file from_orm update_forward_refs".split(" ")
);

// A field named like one of these would shadow it for the annotations that follow in the class body
// (`list: int` makes a later `list[str]` fail), so these get a trailing underscore too.
const SHADOWABLE_NAMES = new Set(
  "int str float bool bytes list dict set tuple object type Any Optional Union Field BaseModel ConfigDict".split(" ")
);

export const pythonRules: NamingRules = {
  autoStyle: "snake",
  cleanStyle: "snake",
  // pydantic treats names with a leading underscore as private, so those are rewritten.
  isValid: /^[A-Za-z][A-Za-z0-9_]*$/,
  // Pydantic reserves the model_ prefix for its own members.
  reserved: { has: (name) => KEYWORDS.has(name) || BASE_MODEL_ATTRIBUTES.has(name) || SHADOWABLE_NAMES.has(name) || name.startsWith("model_") },
  escape: (name) => `${name}_`,
  digitPrefix: "field_",
  upperFirst: false,
  avoidTypeName: false,
  reservedTypes: new Set(["Any", "BaseModel", "ConfigDict", "Field", "Optional", "Union"]),
};

const typeOf = (ref: TypeRef): string => {
  switch (ref.kind) {
    case "string":
      return "str";
    case "boolean":
      return "bool";
    case "int":
    case "long":
      return "int";
    case "double":
      return "float";
    case "null":
      return "None";
    case "any":
      return "Any";
    case "map":
      return "dict[str, Any]";
    case "list":
      return `list[${typeOf(ref.item)}]`;
    case "object":
      return ref.decl.name;
    case "nullable":
      return `Optional[${typeOf(ref.inner)}]`;
    case "union":
      return `Union[${ref.options.map(typeOf).join(", ")}]`;
  }
};

const declare = (decl: TypeDecl) => {
  if (!decl.fields.length) return `class ${decl.name}(BaseModel):\n    pass`;
  const aliased = decl.fields.some((field) => field.name !== field.key);
  const lines = decl.fields.map((field: FieldDecl) => {
    const nullable = field.optional || field.type.kind === "nullable" || field.type.kind === "null";
    let type = typeOf(field.type);
    if (nullable && !/^(Optional\[|None$)/.test(type)) type = `Optional[${type}]`;
    const alias = field.name === field.key ? null : `alias=${JSON.stringify(field.key)}`;
    // Missing and null values default to None, so a payload may leave them out.
    const assignment = alias ? ` = Field(${nullable ? `default=None, ` : ""}${alias})` : nullable ? " = None" : "";
    return `    ${field.name}: ${type}${assignment}`;
  });
  const config = aliased ? "    model_config = ConfigDict(populate_by_name=True)\n\n" : "";
  return `class ${decl.name}(BaseModel):\n${config}${lines.join("\n")}`;
};

/** A field called like a model would hide that model from the annotations after it, so it gets a trailing underscore. */
const apart = (types: TypeDecl[]): TypeDecl[] => {
  const typeNames = new Set(types.map((decl) => decl.name));
  return types.map((decl) => {
    const taken = new Set(decl.fields.map((field) => field.name));
    const fields = decl.fields.map((field) => {
      if (!typeNames.has(field.name)) return field;
      const name = uniqueName(`${field.name}_`, taken);
      taken.add(name);
      return { ...field, name };
    });
    return { ...decl, fields };
  });
};

const emit = (model: Model): EmitResult => {
  // Python needs a class defined before another refers to it, so contained types come first.
  const body = apart([...model.types].reverse()).map(declare).join("\n\n\n");
  const typing = ["Any", "Optional", "Union"].filter((name) => new RegExp(`\\b${name}\\b`).test(body));
  const pydantic = ["BaseModel", /ConfigDict\(/.test(body) && "ConfigDict", /\bField\(/.test(body) && "Field"].filter(Boolean);
  const imports = [typing.length && `from typing import ${typing.join(", ")}\n`, `from pydantic import ${pydantic.join(", ")}`].filter(Boolean).join("\n");
  const notes = model.rootIsList && model.root.kind === "object" ? [`The JSON is an array, so these models describe each item. Validate it with list[${model.root.decl.name}].`] : [];
  return { code: `${imports}\n\n\n${body}\n`, warnings: [], notes };
};

export const python: LanguageSpec = {
  id: "python",
  label: "Python",
  extension: ".py",
  highlight: "python",
  library: "Pydantic v2",
  rules: pythonRules,
  needsObjectRoot: true,
  fileName: (typeName) => `${splitWords(typeName).join("_").toLowerCase() || "model"}.py`,
  emit,
};
