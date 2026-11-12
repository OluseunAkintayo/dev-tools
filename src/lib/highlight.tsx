import React from "react";

export type CodeLanguage = "json" | "xml" | "ts" | "yaml" | "text";

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

const TS_TOKEN = /\b(export|interface|type|extends|readonly)\b|\b(string|number|boolean|null|undefined|unknown|any|Record|Array|object)\b|("(?:\\.|[^"\\])*")|([{}[\]<>;:|?,()])/g;

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
  if (m[1] !== undefined) return [{ text: m[1], className: "text-brand font-medium" }];
  if (m[2] !== undefined) return [{ text: m[2], className: "text-warn" }];
  if (m[3] !== undefined) return [{ text: m[3], className: "text-ink" }];
  return [{ text: m[0], className: "text-ink-3" }];
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
