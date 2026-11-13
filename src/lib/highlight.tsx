import React from "react";

export type CodeLanguage = "json" | "xml" | "ts" | "yaml" | "csharp" | "java" | "kotlin" | "swift" | "go" | "rust" | "dart" | "python" | "text";

/** Above this size, output renders as plain text to keep the page fast. */
const HIGHLIGHT_LIMIT = 300_000;

const JSON_TOKEN = /("(?:\\.|[^"\\])*")(\s*:)?|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?)|\b(true|false|null)\b|([{}[\],:])/g;
const XML_TOKEN = /(<!--[\s\S]*?-->)|(<\/?[\w:.-]+)|([\w:.-]+)(=)("[^"]*"|'[^']*')|(\/?>)/g;
/**
 * Line-oriented YAML: comments (# after whitespace), "key:" at the start of a line or
 * after "- ", quoted strings, anchors and aliases, document markers, and plain
 * true/false/null/numbers that make up a whole value.
 */
const YAML_TOKEN =
  /((?:^|[ \t])#.*$)|^([ \t]*(?:- +)*)("(?:\\.|[^"\\\n])*"|'(?:[^'\n]|'')*'|[^\s#'"{[\]},&*!|>%@`-][^\n#]*?|-[^\s\n#][^\n#]*?)([ \t]*:)(?=[ \t]|$)|("(?:\\.|[^"\\\n])*"|'(?:[^'\n]|'')*')|([&*][^\s,\]}]+)|(^(?:---|\.\.\.)(?=\s|$))|((?<=:[ \t]+|^[ \t]*-[ \t]+|[[,][ \t]*)(?:true|false|null|~|-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?)(?=[ \t]*(?:$|#|,|\]|})))/gm;

const TS_TOKEN = /(\/\/[^\n]*|\/\*[\s\S]*?\*\/)|\b(export|interface|type|extends|readonly|function|return|const|import|from|as|new|typeof)\b|\b(string|number|boolean|null|undefined|unknown|any|Record|Array|object|void)\b|("(?:\\.|[^"\\])*")|([{}[\]<>;:|?,()=])/g;

type Piece = { text: string; className?: string };

const tokenize = (code: string, pattern: RegExp, classify: (match: RegExpExecArray) => Piece[]): Piece[] => {
  const pieces: Piece[] = [];
  let last = 0;
  pattern.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(code))) {
    if (match.index > last) pieces.push({ text: code.slice(last, match.index) });
    pieces.push(...classify(match));
    last = pattern.lastIndex;
  }
  if (last < code.length) pieces.push({ text: code.slice(last) });
  return pieces;
};

const classifyJson = (m: RegExpExecArray): Piece[] => {
  if (m[1] !== undefined) {
    return m[2] !== undefined
      ? [{ text: m[1], className: "text-ink" }, { text: m[2], className: "text-ink-3" }]
      : [{ text: m[1], className: "text-brand" }];
  }
  if (m[3] !== undefined) return [{ text: m[3], className: "text-warn" }];
  if (m[4] !== undefined) return [{ text: m[4], className: "text-code-blue" }];
  return [{ text: m[0], className: "text-ink-3" }];
};

const classifyXml = (m: RegExpExecArray): Piece[] => {
  if (m[1] !== undefined) return [{ text: m[1], className: "text-ink-3 italic" }];
  if (m[2] !== undefined) return [{ text: m[2], className: "text-code-blue" }];
  if (m[3] !== undefined) {
    return [
      { text: m[3], className: "text-ink" },
      { text: m[4], className: "text-ink-3" },
      { text: m[5], className: "text-brand" },
    ];
  }
  return [{ text: m[0], className: "text-code-blue" }];
};

const classifyTs = (m: RegExpExecArray): Piece[] => {
  if (m[1] !== undefined) return [{ text: m[1], className: "text-ink-3 italic" }];
  if (m[2] !== undefined) return [{ text: m[2], className: "text-brand font-medium" }];
  if (m[3] !== undefined) return [{ text: m[3], className: "text-warn" }];
  if (m[4] !== undefined) return [{ text: m[4], className: "text-ink" }];
  return [{ text: m[0], className: "text-ink-3" }];
};

/* ---------- C-family languages and Python, from one pattern per language ---------- */

interface CodeSyntax {
  comment: string;
  /** Annotations or attributes, e.g. @JsonProperty or the name inside [JsonPropertyName(...)]. */
  annotation: string;
  keywords: string[];
  types: string[];
}

const neverMatches = "(?!)";
const cStyleComment = String.raw`\/\/[^\n]*|\/\*[\s\S]*?\*\/`;
const stringLiteral = String.raw`"(?:\\.|[^"\\\n])*"|'(?:\\.|[^'\\\n])*'|` + "`[^`]*`";

const syntaxByLanguage: Record<"csharp" | "java" | "kotlin" | "swift" | "go" | "rust" | "dart" | "python", CodeSyntax> = {
  csharp: {
    comment: cStyleComment,
    annotation: String.raw`(?<=\[(?:property: ?)?)[A-Z]\w*(?=[(\]])`,
    keywords: ["using", "public", "private", "protected", "internal", "class", "record", "struct", "namespace", "static", "readonly", "get", "set", "init", "new", "null", "true", "false", "required"],
    types: ["string", "int", "long", "double", "float", "decimal", "bool", "object", "char", "byte", "short", "List", "Dictionary"],
  },
  java: {
    comment: cStyleComment,
    annotation: String.raw`@\w+`,
    keywords: ["import", "package", "public", "private", "protected", "class", "record", "static", "final", "new", "null", "true", "false", "return", "this", "void", "extends", "implements", "interface"],
    types: ["String", "int", "long", "double", "float", "boolean", "char", "byte", "short", "Object", "List", "Map", "Integer", "Long", "Double", "Boolean"],
  },
  kotlin: {
    comment: cStyleComment,
    annotation: String.raw`@\w+`,
    keywords: ["import", "package", "data", "class", "val", "var", "fun", "null", "true", "false", "object", "interface", "return", "this", "override"],
    types: ["String", "Int", "Long", "Double", "Float", "Boolean", "Any", "List", "Map", "JsonElement"],
  },
  swift: {
    comment: cStyleComment,
    annotation: neverMatches,
    keywords: ["struct", "class", "enum", "let", "var", "func", "init", "case", "switch", "self", "return", "try", "throws", "if", "else", "nil", "true", "false", "private", "public"],
    types: ["String", "Int", "Int64", "Double", "Float", "Bool", "Codable", "CodingKey", "JSONValue", "Decoder", "Encoder"],
  },
  rust: {
    comment: cStyleComment,
    annotation: String.raw`#!?\[[^\]\n]*\]`,
    keywords: ["use", "pub", "struct", "enum", "impl", "fn", "let", "mut", "self", "Self", "type", "mod", "crate", "true", "false", "None", "Some"],
    types: ["String", "i32", "i64", "f64", "bool", "Vec", "Option", "HashMap", "Value", "Box", "Serialize", "Deserialize"],
  },
  dart: {
    comment: cStyleComment,
    annotation: neverMatches,
    keywords: ["class", "final", "const", "factory", "required", "this", "return", "null", "true", "false", "as", "if", "new"],
    types: ["String", "int", "double", "bool", "num", "dynamic", "List", "Map", "Object", "void"],
  },
  go: {
    comment: cStyleComment,
    annotation: neverMatches,
    keywords: ["package", "import", "type", "struct", "func", "return", "interface", "map", "chan", "var", "const", "nil", "true", "false"],
    types: ["string", "int", "int32", "int64", "float32", "float64", "bool", "any", "byte", "rune", "error"],
  },
  python: {
    comment: String.raw`#[^\n]*`,
    annotation: neverMatches,
    keywords: ["from", "import", "class", "def", "return", "pass", "None", "True", "False", "self", "as", "if", "else", "for", "in", "not", "and", "or", "is", "lambda"],
    types: ["str", "int", "float", "bool", "list", "dict", "Any", "Optional", "Union", "BaseModel", "Field", "ConfigDict"],
  },
};

const codePattern = ({ comment, annotation, keywords, types }: CodeSyntax) =>
  new RegExp(`(${comment})|(${stringLiteral})|(${annotation})|\\b(${keywords.join("|")})\\b|\\b(${types.join("|")})\\b|(\\b\\d+(?:\\.\\d+)?\\b)`, "g");

const codePatterns = Object.fromEntries(Object.entries(syntaxByLanguage).map(([language, syntax]) => [language, codePattern(syntax)])) as Record<keyof typeof syntaxByLanguage, RegExp>;

const classifyCode = (m: RegExpExecArray): Piece[] => {
  if (m[1] !== undefined) return [{ text: m[1], className: "text-ink-3 italic" }];
  if (m[2] !== undefined) return [{ text: m[2], className: "text-brand" }];
  if (m[3] !== undefined) return [{ text: m[3], className: "text-code-blue" }];
  if (m[4] !== undefined) return [{ text: m[4], className: "text-brand font-medium" }];
  return [{ text: m[0], className: "text-warn" }];
};

const classifyYaml = (m: RegExpExecArray): Piece[] => {
  if (m[1] !== undefined) return [{ text: m[1], className: "text-ink-3 italic" }];
  if (m[3] !== undefined) {
    return [
      ...(m[2] ? [{ text: m[2] }] : []),
      { text: m[3], className: "text-ink" },
      { text: m[4], className: "text-ink-3" },
    ];
  }
  if (m[5] !== undefined) return [{ text: m[5], className: "text-brand" }];
  if (m[6] !== undefined) return [{ text: m[6], className: "text-code-blue italic" }];
  if (m[7] !== undefined) return [{ text: m[7], className: "text-ink-3" }];
  if (/^(?:true|false|null|~)$/.test(m[8])) return [{ text: m[8], className: "text-code-blue" }];
  return [{ text: m[8], className: "text-warn" }];
};

export const highlight = (code: string, language: CodeLanguage): React.ReactNode => {
  if (language === "text" || code.length > HIGHLIGHT_LIMIT) return code;
  const pieces =
    language === "json"
      ? tokenize(code, JSON_TOKEN, classifyJson)
      : language === "xml"
        ? tokenize(code, XML_TOKEN, classifyXml)
        : language === "yaml"
          ? tokenize(code, YAML_TOKEN, classifyYaml)
          : language in codePatterns
            ? tokenize(code, codePatterns[language as keyof typeof codePatterns], classifyCode)
            : tokenize(code, TS_TOKEN, classifyTs);
  return pieces.map((piece, index) =>
    piece.className ? (
      <span key={index} className={piece.className}>
        {piece.text}
      </span>
    ) : (
      <React.Fragment key={index}>{piece.text}</React.Fragment>
    )
  );
};
