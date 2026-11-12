import { ToolInputError } from "@/lib/toolError";

/**
 * component: encodeURIComponent, for a single query value or path segment.
 * uri:       encodeURI, for a whole URL; keeps : / ? # & = intact.
 * form:      application/x-www-form-urlencoded, as HTML forms and URLSearchParams
 *            send it; spaces become "+".
 */
export type UrlEncoding = "component" | "uri" | "form";

export const encodeUrl = (text: string, encoding: UrlEncoding): string => {
  switch (encoding) {
    case "component":
      return encodeURIComponent(text);
    case "uri":
      return encodeURI(text);
    case "form":
      return new URLSearchParams({ v: text }).toString().slice(2);
  }
};

const fail = (message: string): never => {
  throw new ToolInputError({ message });
};

const lineColumn = (text: string, index: number) => {
  const lines = text.slice(0, index).split("\n");
  return { line: lines.length, column: lines[lines.length - 1].length + 1 };
};

/** Replace "%" signs that do not start a valid escape with "%25". */
const escapeStrayPercents = (text: string) => text.replace(/%(?![0-9A-Fa-f]{2})/g, "%25");

const STRAY_PERCENT_FIX = { label: "Encode stray % signs", apply: escapeStrayPercents };

/** Find why decoding failed: a "%" without two hex digits, or bytes that are not UTF-8. */
const decodeError = (text: string): never => {
  const stray = /%(?![0-9A-Fa-f]{2})/.exec(text);
  if (stray) {
    const { line, column } = lineColumn(text, stray.index);
    throw new ToolInputError({
      message: `"%" on line ${line}, column ${column} is not followed by two hex digits. A literal % is written %25.`,
      line,
      column,
      fix: STRAY_PERCENT_FIX,
    });
  }
  // Every escape is well formed, so a run of escapes must decode to invalid UTF-8.
  for (const run of text.matchAll(/(?:%[0-9A-Fa-f]{2})+/g)) {
    try {
      decodeURIComponent(run[0]);
    } catch {
      const { line, column } = lineColumn(text, run.index ?? 0);
      throw new ToolInputError({
        message: `${run[0]} on line ${line}, column ${column} is not valid UTF-8. The text may use another encoding, or be cut off mid-character.`,
        line,
        column,
      });
    }
  }
  return fail("Could not decode this text.");
};

export const decodeUrl = (text: string, encoding: UrlEncoding): string => {
  const source = encoding === "form" ? text.replace(/\+/g, " ") : text;
  try {
    return encoding === "uri" ? decodeURI(source) : decodeURIComponent(source);
  } catch {
    return decodeError(source);
  }
};

/** Number of %XX escapes, for the status bar. */
export const countEscapes = (text: string) => text.match(/%[0-9A-Fa-f]{2}/g)?.length ?? 0;

/** True when decoding once more would change the text, a sign of double encoding. */
export const looksDoubleEncoded = (decoded: string) => /%[0-9A-Fa-f]{2}/.test(decoded) && (() => {
  try {
    return decodeURIComponent(decoded) !== decoded;
  } catch {
    return false;
  }
})();

/* ---------- Parsing ---------- */

export interface UrlPart {
  id: string;
  label: string;
  value: string;
}

export interface ParsedUrl {
  parts: UrlPart[];
  /** Query parameters in order, decoded. Duplicate keys are kept. */
  params: [string, string][];
  /** Set when "https://" was added because the input had no scheme. */
  assumedScheme: boolean;
}

const DEFAULT_PORTS: Record<string, string> = { "http:": "80", "https:": "443", "ws:": "80", "wss:": "443", "ftp:": "21" };

const safeDecode = (value: string) => {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
};

export const parseUrl = (input: string): ParsedUrl => {
  const text = input.trim();
  if (/\s/.test(text)) fail("URLs cannot contain spaces or line breaks. Encode spaces as %20, or paste one URL at a time.");

  let url: URL;
  let assumedScheme = false;
  try {
    url = new URL(text);
  } catch {
    try {
      url = new URL(`https://${text}`);
      assumedScheme = true;
    } catch {
      return fail("This is not a valid URL. Check the scheme (https://) and the host name.");
    }
  }
  // "localhost:3000" parses as scheme "localhost:"; treat it as a host instead.
  if (!assumedScheme && !text.includes("//") && /^[a-z0-9.-]+:\d+/i.test(text)) {
    url = new URL(`http://${text}`);
    assumedScheme = true;
  }

  const segments = url.pathname.split("/").filter(Boolean).map(safeDecode);
  const port = url.port || (DEFAULT_PORTS[url.protocol] ? `${DEFAULT_PORTS[url.protocol]} (default)` : "");

  const parts: UrlPart[] = [
    { id: "protocol", label: "Scheme", value: url.protocol.replace(/:$/, "") },
    url.username && { id: "username", label: "Username", value: safeDecode(url.username) },
    url.password && { id: "password", label: "Password", value: safeDecode(url.password) },
    { id: "hostname", label: "Host", value: url.hostname },
    port && { id: "port", label: "Port", value: port },
    { id: "origin", label: "Origin", value: url.origin },
    { id: "pathname", label: "Path", value: url.pathname },
    segments.length > 0 && { id: "segments", label: "Path segments (decoded)", value: segments.join("  ›  ") },
    url.search && { id: "search", label: "Query string", value: url.search },
    url.hash && { id: "hash", label: "Fragment", value: safeDecode(url.hash.slice(1)) },
  ].filter((part): part is UrlPart => Boolean(part));

  return { parts, params: [...url.searchParams.entries()], assumedScheme };
};

/**
 * Replace only the query of `input` with `params`, leaving everything else exactly as
 * typed. Values are form-encoded, as URLSearchParams would send them.
 */
export const withQuery = (input: string, params: [string, string][]) => {
  const text = input.trim();
  const hashIndex = text.indexOf("#");
  const beforeHash = hashIndex === -1 ? text : text.slice(0, hashIndex);
  const hash = hashIndex === -1 ? "" : text.slice(hashIndex);
  const queryIndex = beforeHash.indexOf("?");
  const base = queryIndex === -1 ? beforeHash : beforeHash.slice(0, queryIndex);
  const query = new URLSearchParams(params.filter(([key, value]) => key !== "" || value !== "")).toString();
  return `${base}${query ? `?${query}` : ""}${hash}`;
};
