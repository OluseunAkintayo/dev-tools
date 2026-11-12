export interface ToolFix {
  label: string;
  apply: (input: string) => string;
}

export interface ToolError {
  message: string;
  /** 1-based line in the input, when known. */
  line?: number;
  column?: number;
  fix?: ToolFix;
}

export class ToolInputError extends Error {
  readonly detail: ToolError;
  constructor(detail: ToolError) {
    super(detail.message);
    this.detail = detail;
  }
}

const positionToLineColumn = (text: string, position: number) => {
  const before = text.slice(0, Math.max(0, position));
  const lines = before.split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
};

const TRAILING_COMMA = /,(\s*[}\]])/g;

const findTrailingComma = (text: string) => {
  // Ignore commas inside strings by blanking string contents first.
  const masked = text.replace(/"(?:[^"\\]|\\.)*"/g, (match) => `"${" ".repeat(match.length - 2)}"`);
  const match = /,\s*[}\]]/.exec(masked);
  return match ? match.index : -1;
};

const removeTrailingCommas = (text: string) => {
  const masked = text.replace(/"(?:[^"\\]|\\.)*"/g, (match) => `"${" ".repeat(match.length - 2)}"`);
  let result = "";
  let last = 0;
  for (const match of masked.matchAll(TRAILING_COMMA)) {
    const index = match.index ?? 0;
    result += text.slice(last, index);
    last = index + 1; // drop the comma itself
  }
  return result + text.slice(last);
};

/** Parse JSON, turning engine errors into a located, human-readable ToolInputError. */
export const parseJson = (text: string): unknown => {
  try {
    return JSON.parse(text);
  } catch (err) {
    const raw = err instanceof Error ? err.message : "Invalid JSON.";

    const trailing = findTrailingComma(text);
    if (trailing >= 0) {
      const { line, column } = positionToLineColumn(text, trailing);
      throw new ToolInputError({
        message: `Trailing comma on line ${line}. JSON does not allow a comma before a closing bracket.`,
        line,
        column,
        fix: { label: "Remove trailing commas", apply: removeTrailingCommas },
      });
    }

    let line: number | undefined;
    let column: number | undefined;
    const lineCol = /line (\d+) column (\d+)/i.exec(raw);
    const position = /position (\d+)/i.exec(raw);
    if (lineCol) {
      line = Number(lineCol[1]);
      column = Number(lineCol[2]);
    } else if (position) {
      ({ line, column } = positionToLineColumn(text, Number(position[1])));
    }

    const reason = raw
      .replace(/^JSON\.parse:\s*/i, "")
      .replace(/\s*(in JSON )?at position \d+.*$/i, "")
      .replace(/\s*at line \d+ column \d+.*$/i, "")
      .replace(/\s*\(line \d+ column \d+\)/i, "");
    const cleaned = reason.charAt(0).toUpperCase() + reason.slice(1);
    const message = line ? `${cleaned.replace(/\.$/, "")} on line ${line}, column ${column}.` : cleaned;

    throw new ToolInputError({ message, line, column });
  }
};

export const toToolError = (err: unknown, fallback = "Something went wrong."): ToolError => {
  if (err instanceof ToolInputError) return err.detail;
  if (err instanceof Error && err.message) return { message: err.message };
  return { message: fallback };
};
