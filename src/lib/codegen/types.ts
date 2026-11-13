import type { CodeLanguage } from "@/lib/highlight";
import type { Model } from "./model";
import type { NamingRules, NamingStyle } from "./naming";

export type LanguageId = "typescript" | "csharp" | "java" | "kotlin" | "go" | "python";

export interface CodeOptions {
  language: LanguageId;
  /** Name of the root type, as typed. */
  name: string;
  naming: NamingStyle;
  /** Tell int from long from double; when false every number is a double. */
  integers: boolean;
  /** TypeScript: also emit the JSON-as-received types and the functions that convert them. */
  mapper: boolean;
  csharpKind: "class" | "record";
  javaKind: "class" | "record";
}

export interface EmitResult {
  code: string;
  /** Problems the user should know about, e.g. a key the language can't express. */
  warnings: string[];
  /** Things worth knowing that are not problems. */
  notes: string[];
}

export interface GeneratedCode extends EmitResult {
  /** The root type's name as generated, for the file name and status bar. */
  typeName: string;
  typeCount: number;
}

export interface LanguageSpec {
  id: LanguageId;
  label: string;
  extension: string;
  highlight: CodeLanguage;
  /** What annotates renamed fields, shown in the status bar. */
  library: string;
  rules: NamingRules;
  /** The root has to be an object (or an array of objects); TypeScript can also alias other values. */
  needsObjectRoot: boolean;
  fileName: (typeName: string) => string;
  emit: (model: Model, options: CodeOptions) => EmitResult;
}
