/**
 * A string literal for Swift, Rust or Dart: control characters are written as \u{…},
 * which all three accept, and lone surrogates (not valid in any of them) become U+FFFD.
 */
export const stringLiteral = (text: string, quote: '"' | "'" = '"', escapeDollar = false): string => {
  let out = "";
  for (const char of text) {
    const code = char.codePointAt(0)!;
    if (char === quote || char === "\\") out += `\\${char}`;
    else if (char === "$" && escapeDollar) out += "\\$";
    else if (char === "\n") out += "\\n";
    else if (char === "\r") out += "\\r";
    else if (char === "\t") out += "\\t";
    else if (code < 0x20 || code === 0x7f) out += `\\u{${code.toString(16)}}`;
    else if (code >= 0xd800 && code <= 0xdfff) out += "\\u{fffd}";
    else out += char;
  }
  return `${quote}${out}${quote}`;
};
