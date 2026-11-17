/** Turns JSON keys into valid names: unwanted characters are removed, and words are joined per the chosen case (or the language's own for "Auto"). */

export type CaseStyle = "camel" | "pascal" | "snake";
export type NamingStyle = "auto" | "keep" | CaseStyle;

export interface NamingRules {
  autoStyle: Exclude<NamingStyle, "auto">;
  cleanStyle: CaseStyle;
  isValid: RegExp;
  reserved: { has: (name: string) => boolean };
  escape: (name: string) => string;
  digitPrefix: string;
  /** Go exports (and JSON-decodes) only fields that start with a capital letter. */
  upperFirst: boolean;
  /** A member may not share its enclosing type's name (C#, error CS0542). */
  avoidTypeName: boolean;
  /** Identifiers may only use ASCII letters and digits (Dart). Accents are dropped: "über" → "uber". */
  asciiOnly?: boolean;
  reservedTypes: ReadonlySet<string>;
}

export const splitWords = (text: string): string[] =>
  text
    .replace(/([\p{Ll}\p{N}])(\p{Lu})/gu, "$1 $2")
    .replace(/(\p{Lu}+)(\p{Lu}\p{Ll})/gu, "$1 $2")
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

export const foldAscii = (text: string): string => text.normalize("NFD").replace(/\p{M}/gu, "").replace(/[^ -~]/g, " ");

export const fieldName = (key: string, naming: NamingStyle, rules: NamingRules): string => {
  const style = naming === "auto" ? rules.autoStyle : naming;
  let name: string;
  if (style === "keep" && rules.isValid.test(key)) {
    name = key;
  } else {
    const words = splitWords(rules.asciiOnly ? foldAscii(key) : key);
    name = joinWords(words.length ? words : ["field"], style === "keep" ? rules.cleanStyle : style);
  }
  if (rules.upperFirst) name = name.charAt(0).toUpperCase() + name.slice(1);
  if (/^\p{N}/u.test(name) || (rules.upperFirst && !/^\p{Lu}/u.test(name))) name = rules.digitPrefix + name;
  return rules.reserved.has(name) ? rules.escape(name) : name;
};

export const rootTypeName = (input: string): string =>
  input
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join("")
    .replace(/^\p{N}+/u, "");

export const singular = (word: string): string => {
  if (/ies$/i.test(word) && word.length > 3) return `${word.slice(0, -3)}y`;
  if (/(ss|us|is)$/i.test(word)) return word;
  if (/(sh|ch|x|z)es$/i.test(word)) return word.slice(0, -2);
  if (/s$/i.test(word) && word.length > 1) return word.slice(0, -1);
  return word;
};

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

export const uniqueName = (base: string, taken: ReadonlySet<string>): string => {
  let name = base;
  for (let count = 2; taken.has(name); count++) name = `${base}${count}`;
  return name;
};

export const lowerFirst = (text: string) => text.charAt(0).toLowerCase() + text.slice(1);
export const upperFirst = (text: string) => text.charAt(0).toUpperCase() + text.slice(1);
