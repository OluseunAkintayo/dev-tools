import { ToolInputError } from "@/lib/toolError";
import { csharp } from "./csharp";
import { dart } from "./dart";
import { go } from "./go";
import { java } from "./java";
import { kotlin } from "./kotlin";
import { buildModel } from "./model";
import { rootTypeName } from "./naming";
import { python } from "./python";
import { rust } from "./rust";
import { swift } from "./swift";
import { typescript } from "./typescript";
import type { CodeOptions, GeneratedCode, LanguageId, LanguageSpec } from "./types";

export type { CodeOptions, GeneratedCode, LanguageId, LanguageSpec } from "./types";
export { CASE_LABELS, type NamingStyle } from "./naming";

export const LANGUAGES: Record<LanguageId, LanguageSpec> = { typescript, csharp, java, kotlin, swift, go, rust, dart, python };

/** In the order the language picker shows them. */
export const LANGUAGE_IDS: LanguageId[] = ["typescript", "csharp", "java", "kotlin", "swift", "go", "rust", "dart", "python"];

/** Types for a JSON sample, in the chosen language, with names fixed up to be valid there. */
export const generateCode = (data: unknown, options: CodeOptions): GeneratedCode => {
  const spec = LANGUAGES[options.language];
  const model = buildModel(data, { rootName: options.name, naming: options.naming, rules: spec.rules, integers: options.integers });
  if (spec.needsObjectRoot && model.root.kind !== "object") {
    throw new ToolInputError({ message: `${spec.label} needs a JSON object, or an array of objects, at the top level to make a class. Switch to TypeScript for other values.` });
  }
  const { code, warnings, notes } = spec.emit(model, options);
  return {
    code,
    warnings,
    notes,
    typeName: model.root.kind === "object" ? model.root.decl.name : rootTypeName(options.name),
    typeCount: model.types.length,
  };
};
