import type { CodeLanguage } from "@/lib/highlight";
import type { Model } from "./model";
import type { NamingRules, NamingStyle } from "./naming";

export type LanguageId = "typescript" | "csharp" | "java" | "kotlin" | "swift" | "go" | "rust" | "dart" | "python";

export interface CodeOptions {
  language: LanguageId;
  name: string;
  naming: NamingStyle;
  integers: boolean;
  mapper: boolean;
  csharpKind: "class" | "record";
  javaKind: "class" | "record";
}

export interface EmitResult {
  code: string;
  warnings: string[];
  notes: string[];
}

export interface GeneratedCode extends EmitResult {
  typeName: string;
  typeCount: number;
}

export interface LanguageSpec {
  id: LanguageId;
  label: string;
  extension: string;
  highlight: CodeLanguage;
  library: string;
  rules: NamingRules;
  needsObjectRoot: boolean;
  fileName: (typeName: string) => string;
  emit: (model: Model, options: CodeOptions) => EmitResult;
}
