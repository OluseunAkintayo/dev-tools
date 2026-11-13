/**
 * Turning JSON keys into names that are valid in the target language.
 *
 * Spaces and other characters a name can't contain are always removed. How the words are
 * joined (camelCase, PascalCase, snake_case) follows the user's choice, or the language's
 * own convention for "Auto".
 */

export type CaseStyle = "camel" | "pascal" | "snake";
/** "auto" picks the language's convention; "keep" leaves valid names as they are in the JSON. */
export type NamingStyle = "auto" | "keep" | CaseStyle;

export interface NamingRules {
  /** What "Auto" means for this language. */
  autoStyle: Exclude<NamingStyle, "auto">;
  /** How to rewrite a key that is not a valid name when keys are otherwise kept. */
  cleanStyle: CaseStyle;
  /** A key matching this can be used as a name unchanged. */
  isValid: RegExp;
  /** Words that can't be used as names. */
  reserved: { has: (name: string) => boolean };
  /** Makes a reserved word usable, e.g. `class` → `class_`. */
  escape: (name: string) => string;
  /** Put in front of a name that would start with a digit. */
  digitPrefix: string;
  /** Go exports (and JSON-decodes) only fields that start with a capital letter. */
  upperFirst: boolean;
  /** A member may not share its enclosing type's name (C#, error CS0542). */
  avoidTypeName: boolean;
  /** Type names that would shadow something the generated code uses. */
  reservedTypes: ReadonlySet<string>;
}

/** Words of a key: split on anything that is not a letter or digit, and at case changes. */
export const splitWords = (text: string): string[] =>
  text
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2") // fooBar → foo Bar
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, "$1 $2") // HTTPStatus → HTTP Status
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean);

const capitalise = (word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();

export const joinWords = (words: string[], style: CaseStyle): string => {
  switch (style) {
    case "camel":
      return words.map((word, index) => (index === 0 ? word.toLowerCase() : capitalise(word))).join("");
    case "pascal":
      return words.map(capitalise).join("");
    case "snake":
      return words.map((word) => word.toLowerCase()).join("_");
  }
};

export const CASE_LABELS: Record<CaseStyle, string> = { camel: "camelCase", pascal: "PascalCase", snake: "snake_case" };

/** The name for a field. See NamingRules for the pieces. */
export const fieldName = (key: string, naming: NamingStyle, rules: NamingRules): string => {
  const style = naming === "auto" ? rules.autoStyle : naming;
  let name: string;
  if (style === "keep" && rules.isValid.test(key)) {
    name = key;
  } else {
    const words = splitWords(key);
    name = joinWords(words.length ? words : ["field"], style === "keep" ? rules.cleanStyle : style);
  }
  if (rules.upperFirst) name = name.charAt(0).toUpperCase() + name.slice(1);
  if (/^\p{N}/u.test(name) || (rules.upperFirst && !/^\p{Lu}/u.test(name))) name = rules.digitPrefix + name;
  return rules.reserved.has(name) ? rules.escape(name) : name;
};

/** The root type's name from what the user typed: "order item" → "OrderItem", "MyAPI" unchanged. */
export const rootTypeName = (input: string): string =>
  input
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
    .replace(/^\p{N}+/u, "");

/** "orders" → "order", "categories" → "category", "addresses" → "address"; unchanged if no plural ending. */
export const singular = (word: string): string => {
  if (/ies$/i.test(word) && word.length > 3) return `${word.slice(0, -3)}y`;
  if (/(ss|us|is)$/i.test(word)) return word;
  if (/(sh|ch|x|z)es$/i.test(word)) return word.slice(0, -2);
  if (/s$/i.test(word) && word.length > 1) return word.slice(0, -1);
  return word;
};

/** A type name from the key that holds it: "billing address" → "BillingAddress". Items of a list are singular. */
export const typeNameFromKey = (key: string, inList: boolean): string => {
  const words = splitWords(key);
  if (!words.length) return inList ? "Item" : "Object";
  if (inList) {
    const last = words[words.length - 1];
    const one = singular(last);
    // "data" has no plural ending, so "Data" would collide with its parent; call it "DataItem".
    if (one.toLowerCase() === last.toLowerCase()) words.push("Item");
    else words[words.length - 1] = one;
  }
  const name = joinWords(words, "pascal");
  return /^\p{N}/u.test(name) ? `Type${name}` : name;
};

/** `base`, or `base2`, `base3`… so that no name is used twice. */
export const uniqueName = (base: string, taken: ReadonlySet<string>): string => {
  let name = base;
  for (let count = 2; taken.has(name); count++) name = `${base}${count}`;
  return name;
};

export const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
export const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
