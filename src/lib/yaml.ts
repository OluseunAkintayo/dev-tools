import { parseAllDocuments, stringify, YAMLError } from "yaml";
import { sortKeysDeep, stringifyJson, type JsonIndent } from "@/lib/json";
import { parseJson, ToolInputError } from "@/lib/toolError";

export interface YamlToJsonResult {
  json: string;
  documents: number;
  warnings: string[];
}

const toInputError = (err: YAMLError) => {
  const position = err.linePos?.[0];
  const reason = err.message.split("\n")[0].replace(/ at line \d+, column \d+:?$/, "");
  return new ToolInputError({
    message: position ? `${reason.replace(/\.$/, "")} (line ${position.line}, column ${position.col}).` : reason,
    line: position?.line,
    column: position?.col,
  });
};

const findNonFinite = (value: unknown, path: string, out: string[]) => {
  if (out.length >= 5) return;
  if (typeof value === "number" && !Number.isFinite(value)) out.push(`${path || "The value"} is ${value}, which JSON writes as null.`);
  else if (Array.isArray(value)) value.forEach((item, index) => findNonFinite(item, `${path}[${index}]`, out));
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) findNonFinite(item, path ? `${path}.${key}` : key, out);
};

/** YAML 1.2 to JSON. Several documents become an array; aliases are expanded (the alias limit stops "billion laughs") and "<<" merges apply. */
export const yamlToJson = (text: string, indent: JsonIndent): YamlToJsonResult => {
  const docs = parseAllDocuments(text, { merge: true, prettyErrors: true });
  if (!Array.isArray(docs)) return { json: "", documents: 0, warnings: [] };
  const failed = docs.flatMap((doc) => doc.errors)[0];
  if (failed) throw toInputError(failed);

  let values: unknown[];
  try {
    values = docs.map((doc) => doc.toJS({ maxAliasCount: 100 }));
  } catch (err) {
    if (err instanceof YAMLError) throw toInputError(err);
    throw new ToolInputError({ message: err instanceof Error ? err.message : "Could not convert this YAML." });
  }

  const value = values.length === 1 ? values[0] : values;
  const warnings: string[] = [];
  findNonFinite(value, "", warnings);
  for (const doc of docs) for (const warning of doc.warnings) warnings.push(warning.message.split("\n")[0]);
  return { json: stringifyJson(value ?? null, indent), documents: values.length, warnings };
};

export interface JsonToYamlOptions {
  indent: 2 | 4;
  sortKeys: boolean;
}

/** JSON to block-style YAML, with 1.1 quoting so "yes", "on", "2026-11-12" etc. stay strings in PyYAML and older tooling. */
export const jsonToYaml = (text: string, { indent, sortKeys }: JsonToYamlOptions) => {
  const value = parseJson(text);
  return stringify(sortKeys ? sortKeysDeep(value) : value, { indent, lineWidth: 0, version: "1.1" });
};
