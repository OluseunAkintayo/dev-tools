/** Flags the tester offers. "d" (indices) is always added internally to locate groups. */
export const REGEX_FLAGS = [
  { flag: "g", name: "global", hint: "Find every match, not just the first" },
  { flag: "i", name: "ignore case", hint: "Case-insensitive" },
  { flag: "m", name: "multiline", hint: "^ and $ match at line breaks" },
  { flag: "s", name: "dotAll", hint: ". also matches line breaks" },
  { flag: "u", name: "unicode", hint: "Unicode code points and \\p{…} classes" },
  { flag: "v", name: "unicodeSets", hint: "Like u, plus set operations in classes" },
  { flag: "y", name: "sticky", hint: "Match only at lastIndex" },
] as const;

export type RegexFlag = (typeof REGEX_FLAGS)[number]["flag"];

export interface MatchGroup {
  /** "1", "2", … or the group's name. */
  label: string;
  value: string | undefined;
  start?: number;
  end?: number;
}

export interface RegexMatch {
  index: number;
  end: number;
  text: string;
  groups: MatchGroup[];
}

export interface RegexResult {
  matches: RegexMatch[];
  /** More matches exist than were collected. */
  truncated: boolean;
  /** Present when a replacement was requested. */
  replaced?: string;
}

/** Stop collecting after this many matches; highlighting more would not help anyone. */
export const MAX_MATCHES = 5000;

/** A pattern that has not finished after this long is stopped. */
export const REGEX_TIMEOUT_MS = 1500;

/** Normalise flags: valid letters only, each once, u and v never together (v wins). */
export const normaliseFlags = (flags: string) => {
  const set = new Set(flags.split("").filter((flag) => REGEX_FLAGS.some((item) => item.flag === flag)));
  if (set.has("v")) set.delete("u");
  return REGEX_FLAGS.map((item) => item.flag).filter((flag) => set.has(flag)).join("");
};

/** Build the RegExp, or return the engine's syntax error in readable form. */
export const compileRegex = (source: string, flags: string): { regex: RegExp } | { error: string } => {
  try {
    return { regex: new RegExp(source, `${normaliseFlags(flags)}d`) };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid pattern.";
    // "Invalid regular expression: /(/d: Unterminated group" → "Unterminated group"
    return { error: message.replace(/^Invalid regular expression: \/.*\/[a-z]*: /s, "").replace(/^./, (c) => c.toUpperCase()) };
  }
};

/**
 * The name of each capturing group in order (undefined for unnamed ones), read from the
 * pattern: escapes and character classes are skipped, and (?:, (?=, (?!, (?<=, (?<!
 * and modifier groups such as (?i:) do not capture.
 */
export const groupNames = (source: string): (string | undefined)[] => {
  const names: (string | undefined)[] = [];
  let inClass = 0;
  for (let i = 0; i < source.length; i++) {
    const char = source[i];
    if (char === "\\") {
      i++;
      continue;
    }
    if (char === "[") inClass++;
    else if (char === "]" && inClass) inClass--;
    else if (char === "(" && !inClass) {
      if (source[i + 1] !== "?") names.push(undefined);
      else if (source[i + 2] === "<" && source[i + 3] !== "=" && source[i + 3] !== "!") {
        const close = source.indexOf(">", i + 3);
        names.push(close > i ? source.slice(i + 3, close) : undefined);
      }
    }
  }
  return names;
};

/** Every match with group positions. Runs inside the worker. */
export const runRegex = (source: string, flags: string, text: string, replacement?: string): RegexResult => {
  const compiled = compileRegex(source, flags);
  if ("error" in compiled) throw new Error(compiled.error);
  const { regex } = compiled;

  const names = groupNames(source);
  // `indices` (the d flag, ES2022) is newer than this project's TypeScript lib target.
  const toMatch = (match: RegExpExecArray): RegexMatch => {
    const indices = (match as RegExpExecArray & { indices?: ([number, number] | undefined)[] }).indices;
    const groups: MatchGroup[] = [];
    for (let i = 1; i < match.length; i++) {
      const range = indices?.[i];
      groups.push({ label: names[i - 1] ?? String(i), value: match[i], start: range?.[0], end: range?.[1] });
    }
    return { index: match.index, end: match.index + match[0].length, text: match[0], groups };
  };

  const matches: RegexMatch[] = [];
  let truncated = false;
  if (regex.global || regex.sticky) {
    regex.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(text))) {
      if (matches.length >= MAX_MATCHES) {
        truncated = true;
        break;
      }
      matches.push(toMatch(match));
      if (!regex.global) break; // sticky without global: one match at lastIndex
      // An empty match would loop forever; step past it (by code point in u/v mode).
      if (match[0] === "") {
        const unicode = regex.flags.includes("u") || regex.flags.includes("v");
        regex.lastIndex += unicode && match.index < text.length ? String.fromCodePoint(text.codePointAt(match.index)!).length : 1;
      }
    }
  } else {
    const match = regex.exec(text);
    if (match) matches.push(toMatch(match));
  }

  const result: RegexResult = { matches, truncated };
  if (replacement !== undefined) {
    regex.lastIndex = 0;
    result.replaced = text.replace(regex, replacement);
  }
  return result;
};

/** Messages between useRegex and regex.worker.ts. */
export type RegexWorkerRequest = { id: number; source: string; flags: string; text: string; replacement?: string };
export type RegexWorkerResponse = { id: number; result: RegexResult } | { id: number; error: string };

/** Text split into plain and matched pieces, for highlighting. */
export const splitByMatches = (text: string, matches: RegexMatch[]) => {
  const pieces: { text: string; match?: number }[] = [];
  let last = 0;
  matches.forEach((match, index) => {
    if (match.end <= match.index) return; // empty matches have nothing to highlight
    if (match.index > last) pieces.push({ text: text.slice(last, match.index) });
    pieces.push({ text: text.slice(match.index, match.end), match: index });
    last = match.end;
  });
  if (last < text.length) pieces.push({ text: text.slice(last) });
  return pieces;
};
