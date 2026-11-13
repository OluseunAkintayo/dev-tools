import { inferShape, type Shape } from "@/lib/inferShape";
import { ToolInputError } from "@/lib/toolError";
import { fieldName, foldAscii, rootTypeName, typeNameFromKey, uniqueName, type NamingRules, type NamingStyle } from "./naming";

/**
 * A language-neutral description of the types in a JSON sample. Each language turns it
 * into code, so inference, naming and de-duplication happen once.
 */

export type ScalarKind = "string" | "boolean" | "int" | "long" | "double" | "any" | "map" | "null";

export type TypeRef =
  | { kind: ScalarKind }
  /** The value may be null. */
  | { kind: "nullable"; inner: TypeRef }
  | { kind: "list"; item: TypeRef }
  | { kind: "object"; decl: TypeDecl }
  /** Different types in the same place, without null. */
  | { kind: "union"; options: TypeRef[] };

export interface FieldDecl {
  /** The key in the JSON. */
  key: string;
  /** The name in the generated code. */
  name: string;
  type: TypeRef;
  /** Missing from some of the objects in the sample. */
  optional: boolean;
}

export interface TypeDecl {
  name: string;
  fields: FieldDecl[];
}

export interface Model {
  /** The type of the whole document, or of each item when it is an array of objects. */
  root: TypeRef;
  /** Declared types, each before the types it contains. */
  types: TypeDecl[];
  /** The JSON is an array and the types describe its items. */
  rootIsList: boolean;
  /** Fields whose name differs from the JSON key. */
  renamed: number;
}

export interface BuildOptions {
  rootName: string;
  naming: NamingStyle;
  rules: NamingRules;
  /** Tell int from long from double; when false every number is a double. */
  integers: boolean;
}

type ObjectShape = Extract<Shape, { kind: "object" }>;

export const buildModel = (data: unknown, options: BuildOptions): Model => {
  const { rules } = options;
  const asciiType = (name: string) => (rules.asciiOnly ? foldAscii(name).replace(/\s+/g, "") : name);
  const rootName = asciiType(rootTypeName(options.rootName));
  if (!rootName) throw new ToolInputError({ message: "The type name must contain at least one letter." });

  const types: TypeDecl[] = [];
  const used = new Set<string>();

  const claimTypeName = (wanted: string) => {
    // A type called String or List would shadow the one the generated code relies on.
    const plain = asciiType(wanted) || "Model";
    const base = rules.reservedTypes.has(plain) ? `${plain}Model` : plain;
    const name = uniqueName(base, used);
    used.add(name);
    return name;
  };

  const declare = (shape: ObjectShape, name: string): TypeRef => {
    const decl: TypeDecl = { name: claimTypeName(name), fields: [] };
    types.push(decl);
    const taken = new Set<string>();
    for (const field of shape.fields) {
      let fieldNameValue = fieldName(field.key, options.naming, rules);
      if (rules.avoidTypeName && fieldNameValue === decl.name) fieldNameValue = `${fieldNameValue}Value`;
      fieldNameValue = uniqueName(fieldNameValue, taken);
      taken.add(fieldNameValue);
      decl.fields.push({ key: field.key, name: fieldNameValue, type: build(field.shape, field.key, false), optional: field.optional });
    }
    return { kind: "object", decl };
  };

  const build = (shape: Shape, hint: string, inList: boolean): TypeRef => {
    switch (shape.kind) {
      case "string":
        return { kind: "string" };
      case "boolean":
        return { kind: "boolean" };
      case "null":
        return { kind: "null" };
      case "unknown":
        return { kind: "any" };
      case "number":
        if (!options.integers || !shape.integer) return { kind: "double" };
        return { kind: shape.wide ? "long" : "int" };
      case "array":
        return { kind: "list", item: build(shape.item, hint, true) };
      case "object":
        // {} has no fields to describe, so it is a free-form map.
        return shape.fields.length === 0 ? { kind: "map" } : declare(shape, typeNameFromKey(hint, inList));
      case "union": {
        const rest = shape.options.filter((option) => option.kind !== "null");
        const nullable = rest.length < shape.options.length;
        const refs = rest.map((option) => build(option, hint, inList));
        const inner: TypeRef = refs.length === 1 ? refs[0] : { kind: "union", options: refs };
        return nullable ? { kind: "nullable", inner } : inner;
      }
    }
  };

  const inferred = inferShape(data);
  // An array of objects describes its items.
  const rootIsList = inferred.kind === "array" && inferred.item.kind === "object";
  const rootShape = rootIsList ? (inferred as Extract<Shape, { kind: "array" }>).item : inferred;

  let root: TypeRef;
  if (rootShape.kind === "object") {
    root = declare(rootShape, rootName);
  } else {
    used.add(rootName);
    root = build(rootShape, rootName, false);
  }

  const renamed = types.reduce((count, decl) => count + decl.fields.filter((field) => field.name !== field.key).length, 0);
  return { root, types, rootIsList, renamed };
};

/** Every type a reference points to, directly or inside lists, nullables and unions. */
export const referencedDecls = (ref: TypeRef): TypeDecl[] => {
  switch (ref.kind) {
    case "object":
      return [ref.decl];
    case "list":
      return referencedDecls(ref.item);
    case "nullable":
      return referencedDecls(ref.inner);
    case "union":
      return ref.options.flatMap(referencedDecls);
    default:
      return [];
  }
};

/**
 * Renames fields that share a name with any of the types, for languages where the field
 * would hide the type from the code after it. The suffix keeps the JSON key readable.
 */
export const apartFromTypes = (types: TypeDecl[], suffix = "_"): TypeDecl[] => {
  const typeNames = new Set(types.map((decl) => decl.name));
  return types.map((decl) => {
    const taken = new Set(decl.fields.map((field) => field.name));
    const fields = decl.fields.map((field) => {
      if (!typeNames.has(field.name)) return field;
      const name = uniqueName(`${field.name}${suffix}`, taken);
      taken.add(name);
      return { ...field, name };
    });
    return { ...decl, fields };
  });
};
