import type { FieldDecl, Model, TypeDecl, TypeRef } from "./model";
import { uniqueName, upperFirst, type NamingRules } from "./naming";
import type { CodeOptions, EmitResult, LanguageSpec } from "./types";

const KEYWORDS = new Set(
  // Keywords and literals, plus names a record component may not have (they clash with Object's methods).
  "abstract assert boolean break byte case catch char class const continue default do double else enum extends final finally float for goto if implements import instanceof int interface long native new package private protected public return short static strictfp super switch synchronized this throw throws transient try void volatile while true false null _ clone finalize getClass hashCode notify notifyAll toString wait".split(" ")
);

export const javaRules: NamingRules = {
  autoStyle: "camel",
  cleanStyle: "camel",
  isValid: /^[A-Za-z_$][\w$]*$/,
  reserved: KEYWORDS,
  escape: (name) => `${name}_`,
  digitPrefix: "_",
  upperFirst: false,
  avoidTypeName: false,
  reservedTypes: new Set(["Boolean", "Double", "Integer", "JsonAutoDetect", "JsonProperty", "List", "Long", "Map", "Object", "Override", "Record", "String", "Visibility"]),
};

/** `boxed` is needed inside generics and wherever null is possible. */
const typeOf = (ref: TypeRef, boxed: boolean): string => {
  switch (ref.kind) {
    case "string":
      return "String";
    case "boolean":
      return boxed ? "Boolean" : "boolean";
    case "int":
      return boxed ? "Integer" : "int";
    case "long":
      return boxed ? "Long" : "long";
    case "double":
      return boxed ? "Double" : "double";
    case "null":
    case "any":
    case "union":
      return "Object";
    case "map":
      return "Map<String, Object>";
    case "list":
      return `List<${typeOf(ref.item, true)}>`;
    case "object":
      return ref.decl.name;
    case "nullable":
      return typeOf(ref.inner, true);
  }
};

const fieldType = (field: FieldDecl) => typeOf(field.type, field.optional || field.type.kind === "nullable");
const annotation = (field: FieldDecl) => (field.name === field.key ? null : `@JsonProperty(${JSON.stringify(field.key)})`);

const indent = (text: string, spaces: number) =>
  text
    .split("\n")
    .map((line) => (line ? " ".repeat(spaces) + line : line))
    .join("\n");

const asRecord = (decl: TypeDecl, nested: string[]) => {
  const components = decl.fields.map((field) => `        ${annotation(field) ? `${annotation(field)} ` : ""}${fieldType(field)} ${field.name}`);
  const head = decl.fields.length ? `public record ${decl.name}(\n${components.join(",\n")}\n)` : `public record ${decl.name}()`;
  return nested.length ? `${head} {\n${nested.map((block) => indent(block, 4)).join("\n\n")}\n}` : `${head} {}`;
};

/** The property name Jackson derives from a getter: leading capitals are lowered, so getHTTPStatus is "httpstatus". */
const impliedName = (accessorSuffix: string) => accessorSuffix.replace(/^[A-Z]+/, (capitals) => capitals.toLowerCase());
const asClass = (decl: TypeDecl, nested: string[], isNested: boolean) => {
  // getClass() is final in Object, and two fields may differ only by case, so accessor names are made unique.
  const taken = new Set(["Class"]);
  const accessorNames = decl.fields.map((field) => {
    const suffix = uniqueName(upperFirst(field.name), taken);
    taken.add(suffix);
    return suffix;
  });
  // Jackson pairs a field with its getter by name. When the two differ it would see two properties, so it reads fields only.
  const byField = decl.fields.some((field, index) => annotation(field) || impliedName(accessorNames[index]) !== field.name);
  const fields = decl.fields.map((field) => `${annotation(field) ? `    ${annotation(field)}\n` : ""}    private ${fieldType(field)} ${field.name};`);
  const accessors = decl.fields.map((field, index) => {
    const type = fieldType(field);
    const suffix = accessorNames[index];
    return [
      `    public ${type} ${type === "boolean" ? "is" : "get"}${suffix}() { return ${field.name}; }`,
      `    public void set${suffix}(${type} ${field.name}) { this.${field.name} = ${field.name}; }`,
    ].join("\n");
  });
  const sections = [fields.join("\n\n"), accessors.join("\n\n"), ...nested.map((block) => indent(block, 4))].filter(Boolean);
  const header = byField ? "@JsonAutoDetect(fieldVisibility = Visibility.ANY, getterVisibility = Visibility.NONE, isGetterVisibility = Visibility.NONE, setterVisibility = Visibility.NONE)\n" : "";
  return `${header}public ${isNested ? "static " : ""}class ${decl.name} {${sections.length ? `\n${sections.join("\n\n")}\n` : ""}}`;
};

const emit = (model: Model, options: CodeOptions): EmitResult => {
  const [root, ...rest] = model.types;
  const record = options.javaKind === "record";
  const render = (decl: TypeDecl, nested: string[], isNested: boolean) => (record ? asRecord(decl, nested) : asClass(decl, nested, isNested));
  // Every other type is nested directly in the root, so they all resolve by simple name.
  const body = render(root, rest.map((decl) => render(decl, [], true)), false);
  const imports = [
    /@JsonAutoDetect/.test(body) && "import com.fasterxml.jackson.annotation.JsonAutoDetect;",
    /@JsonAutoDetect/.test(body) && "import com.fasterxml.jackson.annotation.JsonAutoDetect.Visibility;",
    /@JsonProperty/.test(body) && "import com.fasterxml.jackson.annotation.JsonProperty;",
    /\bList</.test(body) && "import java.util.List;",
    /\bMap</.test(body) && "import java.util.Map;",
  ].filter(Boolean);
  const notes = model.rootIsList ? [`The JSON is an array, so these types describe each item. Read it as List<${root.name}>.`] : [];
  return { code: `${imports.length ? `${imports.join("\n")}\n\n` : ""}${body}\n`, warnings: [], notes };
};

export const java: LanguageSpec = {
  id: "java",
  label: "Java",
  extension: ".java",
  highlight: "java",
  library: "Jackson",
  rules: javaRules,
  needsObjectRoot: true,
  fileName: (typeName) => `${typeName}.java`,
  emit,
};
