import { formatKey } from "@/lib/inferShape";
import { referencedDecls, type Model, type TypeDecl, type TypeRef } from "./model";
import { lowerFirst, rootTypeName, uniqueName, type NamingRules } from "./naming";
import type { CodeOptions, EmitResult, LanguageSpec } from "./types";

const IDENTIFIER = /^[A-Za-z_$][\w$]*$/;

export const typescriptRules: NamingRules = {
  // Valid names are kept as they are, so a sample like {"user_id": 1} gives `user_id`.
  autoStyle: "keep",
  cleanStyle: "camel",
  isValid: IDENTIFIER,
  // Property names may be reserved words.
  reserved: new Set<string>(),
  escape: (name) => name,
  digitPrefix: "_",
  upperFirst: false,
  avoidTypeName: false,
  reservedTypes: new Set(["Array", "Boolean", "Date", "Error", "Function", "Map", "Number", "Object", "Omit", "Partial", "Pick", "Promise", "Readonly", "Record", "Required", "Set", "String", "Symbol"]),
};

/** Types whose JSON keys differ from their property names, or that contain such a type. */
const typesNeedingMapping = (model: Model): Set<TypeDecl> => {
  const memo = new Map<TypeDecl, boolean>();
  const needs = (decl: TypeDecl): boolean => {
    const known = memo.get(decl);
    if (known !== undefined) return known;
    memo.set(decl, false); // guards against cycles; JSON can't have any
    const result = decl.fields.some((field) => field.name !== field.key || referencedDecls(field.type).some(needs));
    memo.set(decl, result);
    return result;
  };
  return new Set(model.types.filter(needs));
};

const emit = (model: Model, options: CodeOptions): EmitResult => {
  const rootName = rootTypeName(options.name);
  const warnings: string[] = [];
  const notes: string[] = [];

  const mapped = options.mapper ? typesNeedingMapping(model) : new Set<TypeDecl>();
  // Names for the "as received" types, e.g. RootJson, that don't collide with anything else.
  const taken = new Set([rootName, ...model.types.map((decl) => decl.name)]);
  const wireNames = new Map<TypeDecl, string>();
  for (const decl of model.types) {
    if (!mapped.has(decl)) continue;
    const name = uniqueName(`${decl.name}Json`, taken);
    taken.add(name);
    wireNames.set(decl, name);
  }

  const typeOf = (ref: TypeRef, wire: boolean): string => {
    switch (ref.kind) {
      case "string":
        return "string";
      case "boolean":
        return "boolean";
      case "int":
      case "long":
      case "double":
        return "number";
      case "null":
        return "null";
      case "any":
        return "unknown";
      case "map":
        return "Record<string, unknown>";
      case "list": {
        const item = typeOf(ref.item, wire);
        return /^[\w$.]+(?:\[\])*$/.test(item) ? `${item}[]` : `Array<${item}>`;
      }
      case "object":
        return wire && mapped.has(ref.decl) ? wireNames.get(ref.decl)! : ref.decl.name;
      case "nullable":
        return `${typeOf(ref.inner, wire)} | null`;
      case "union":
        return ref.options.map((option) => typeOf(option, wire)).join(" | ");
    }
  };

  const declare = (decl: TypeDecl, wire: boolean) => {
    const name = wire ? wireNames.get(decl)! : decl.name;
    if (!decl.fields.length) return `export interface ${name} {}`;
    const lines = decl.fields.map((field) => `  ${wire ? formatKey(field.key) : field.name}${field.optional ? "?" : ""}: ${typeOf(field.type, wire)};`);
    return `export interface ${name} {\n${lines.join("\n")}\n}`;
  };

  const blocks: string[] = [];
  if (model.types.length) blocks.push(model.types.map((decl) => declare(decl, false)).join("\n\n"));
  if (model.root.kind !== "object") blocks.push(`export type ${rootName} = ${typeOf(model.root, false)};`);

  if (mapped.size) {
    const wire = model.types.filter((decl) => mapped.has(decl));
    blocks.push(`// The JSON as received, with its original keys.\n${wire.map((decl) => declare(decl, true)).join("\n\n")}`);

    const functionName = (decl: TypeDecl) => `${lowerFirst(decl.name)}FromJson`;
    const access = (key: string) => (IDENTIFIER.test(key) ? `json.${key}` : `json[${JSON.stringify(key)}]`);

    /** The expression that converts `expr` to its clean type, or null when it needs no conversion. */
    const convert = (ref: TypeRef, expr: string, depth: number): string | null => {
      switch (ref.kind) {
        case "object":
          return mapped.has(ref.decl) ? `${functionName(ref.decl)}(${expr})` : null;
        case "list": {
          const param = depth === 0 ? "item" : `item${depth + 1}`;
          const inner = convert(ref.item, param, depth + 1);
          return inner ? `${expr}.map((${param}) => ${inner})` : null;
        }
        case "nullable": {
          const inner = convert(ref.inner, expr, depth);
          return inner ? `${expr} === null ? null : ${inner}` : null;
        }
        case "union": {
          // A union holds at most one object type and one list type, plus plain values.
          const list = ref.options.find((option) => option.kind === "list");
          const object = ref.options.find((option) => option.kind === "object");
          const fromList = list ? convert(list, expr, depth) : null;
          const fromObject = object ? convert(object, expr, depth) : null;
          if (!fromList && !fromObject) return null;
          let result = expr;
          if (fromObject) result = `typeof ${expr} === "object" && ${expr} !== null ? ${fromObject} : ${result}`;
          if (fromList) result = `Array.isArray(${expr}) ? ${fromList} : ${result}`;
          return result;
        }
        default:
          return null;
      }
    };

    const functions = wire.map((decl) => {
      const fields = decl.fields.map((field) => {
        const value = access(field.key);
        const converted = convert(field.type, value, 0);
        const expression = converted && field.optional ? `${value} === undefined ? undefined : ${converted}` : (converted ?? value);
        return `    ${field.name}: ${expression},`;
      });
      return `export function ${functionName(decl)}(json: ${wireNames.get(decl)}): ${decl.name} {\n  return {\n${fields.join("\n")}\n  };\n}`;
    });
    blocks.push(`// Converts the JSON as received into the types above.\n${functions.join("\n\n")}`);
    if (model.root.kind !== "object") notes.push(`The sample is not a single object, so there is no function for ${rootName} itself; use the functions for the types it contains.`);
    else if (model.rootIsList) notes.push(`The JSON is an array. Convert each item: items.map(${functionName(model.root.decl)}).`);
  } else if (model.renamed > 0) {
    warnings.push(
      `${model.renamed} ${model.renamed === 1 ? "property name differs" : "property names differ"} from the JSON keys, so parsed JSON won't match these types. Turn on JSON mapper to convert it.`
    );
  }

  if (model.rootIsList && !mapped.size) notes.push("The JSON is an array, so these types describe each item.");
  return { code: `${blocks.join("\n\n")}\n`, warnings, notes };
};

export const typescript: LanguageSpec = {
  id: "typescript",
  label: "TypeScript",
  extension: ".ts",
  highlight: "ts",
  library: "Interfaces",
  rules: typescriptRules,
  needsObjectRoot: false,
  fileName: (typeName) => `${typeName}.ts`,
  emit,
};
