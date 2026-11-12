import { parseAllDocuments, stringify, YAMLError } from "yaml";
import { sortKeysDeep, stringifyJson, type JsonIndent } from "@/lib/json";
import { parseJson, ToolInputError } from "@/lib/toolError";

export interface YamlToJsonResult {
  json: string;
  documents: number;
  /** Things JSON cannot represent exactly, e.g. ".inf" written as null. */
  warnings: string[];
}

/** A YAMLError as a located ToolInputError, keeping only the first line of its message. */
const toInputError = (err: YAMLError) => {
  const position = err.linePos?.[0];
  const reason = err.message.split("\n")[0].replace(/ at line \d+, column \d+:?$/, "");
  return new ToolInputError({
    message: position ? `${reason.replace(/\.$/, "")} (line ${position.line}, column ${position.col}).` : reason,
    line: position?.line,
    column: position?.col,
  });
};

/** Walks the converted value once to find numbers JSON would turn into null. */
const findNonFinite = (value: unknown, path: string, out: string[]) => {
  if (out.length >= 5) return;
  if (typeof value === "number" && !Number.isFinite(value)) out.push(`${path || "The value"} is ${value}, which JSON writes as null.`);
  else if (Array.isArray(value)) value.forEach((item, index) => findNonFinite(item, `${path}[${index}]`, out));
  else if (value && typeof value === "object") for (const [key, item] of Object.entries(value)) findNonFinite(item, path ? `${path}.${key}` : key, out);
};

/**
 * YAML 1.2 (core schema) to JSON. Several "---" documents become a JSON array.
 * Anchors and aliases are expanded, with the library's alias limit guarding against
 * "billion laughs" inputs; "<<" merge keys are applied.
 */
export const yamlToJson = (text: string, indent: JsonIndent): YamlToJsonResult => {
  const docs = parseAllDocuments(text, { merge: true, prettyErrors: true });
  if (!Array.isArray(docs)) return { json: "", documents: 0, warnings: [] }; // only comments or directives
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

/**
 * JSON to block-style YAML. Long strings stay on one line instead of being folded.
 * Written with YAML 1.1 quoting rules, so strings such as "yes", "on", "no" or
 * "2026-11-12" are quoted. YAML 1.2 parsers read the result the same way, and 1.1
 * parsers (PyYAML, older Kubernetes and Ansible tooling) do not turn them into
 * booleans or dates.
 */
export const jsonToYaml = (text: string, { indent, sortKeys }: JsonToYamlOptions) => {
  const value = parseJson(text);
  return stringify(sortKeys ? sortKeysDeep(value) : value, { indent, lineWidth: 0, version: "1.1" });
};
