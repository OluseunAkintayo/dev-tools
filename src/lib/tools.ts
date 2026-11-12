import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, BadgeCheck, Binary, Braces, Clock, FileCode2, FileJson, FileText, Fingerprint, FlaskConical, GitCompareArrows, IdCard, KeyRound, Link2, Palette, Regex, Sheet, WandSparkles } from "lucide-react";

export type CategoryId = "format" | "convert" | "generate" | "encode" | "compare" | "test" | "design";

export interface Category {
  id: CategoryId;
  label: string;
  icon: LucideIcon;
}

export const categories: Category[] = [
  { id: "format", label: "Format", icon: WandSparkles },
  { id: "convert", label: "Convert", icon: ArrowLeftRight },
  { id: "generate", label: "Generate", icon: Braces },
  { id: "encode", label: "Encode", icon: Binary },
  { id: "compare", label: "Compare", icon: GitCompareArrows },
  { id: "test", label: "Test", icon: FlaskConical },
  { id: "design", label: "Design", icon: Palette },
];

export type ToolId =
  | "json-formatter"
  | "json-to-interface"
  | "json-to-zod"
  | "json-diff"
  | "regex"
  | "base64"
  | "jwt"
  | "timestamp"
  | "url"
  | "hash"
  | "uuid"
  | "csv-to-json"
  | "json-to-csv"
  | "xml-to-json"
  | "json-to-xml"
  | "yaml-to-json"
  | "json-to-yaml"
  | "shadcn-theme";

export interface Tool {
  id: ToolId;
  title: string;
  /** One-line summary used on cards and in the command menu. */
  description: string;
  /** Sentence shown under the tool page heading. */
  intro: string;
  category: CategoryId;
  icon: LucideIcon;
  link: string;
  status: "live" | "soon";
  keywords: string[];
  /** Landing grid footprint when the "All" filter is active. */
  size: "feature" | "wide" | "normal" | "banner";
  /** Input/output format pair, shown on converter cards. */
  pair?: [string, string];
}

export const tools: Tool[] = [
  {
    id: "json-formatter",
    title: "JSON Formatter",
    description: "Format and validate JSON. Pick 2 spaces, 4 spaces or tabs, and sort keys if you want.",
    intro: "Paste JSON. The formatted result appears as you type.",
    category: "format",
    icon: WandSparkles,
    link: "/json-formatter",
    status: "live",
    keywords: ["json", "pretty", "beautify", "validate", "lint", "indent"],
    size: "feature",
  },
  {
    id: "json-to-interface",
    title: "TS Interface Generator",
    description: "Turn a JSON sample into TypeScript interfaces with inferred types.",
    intro: "Paste a JSON sample. The TypeScript interface appears as you type.",
    category: "generate",
    icon: Braces,
    link: "/json-to-interface",
    status: "live",
    keywords: ["typescript", "ts", "interface", "type", "json", "types"],
    size: "wide",
  },
  {
    id: "json-to-zod",
    title: "JSON to Zod",
    description: "Turn a JSON sample into a Zod schema, for Zod 4 or 3.",
    intro: "Paste a JSON sample. The Zod schema appears as you type, with optional keys and unions inferred from every array item.",
    category: "generate",
    icon: BadgeCheck,
    link: "/json-to-zod",
    status: "live",
    keywords: ["zod", "schema", "validation", "typescript", "json", "infer", "runtime"],
    size: "normal",
  },
  {
    id: "json-diff",
    title: "JSON Diff",
    description: "Compare two JSON documents and list every difference by path.",
    intro: "Paste two JSON documents. Every added, removed and changed value is listed by its JSONPath, ignoring key order.",
    category: "compare",
    icon: GitCompareArrows,
    link: "/json-diff",
    status: "live",
    keywords: ["diff", "compare", "json", "difference", "changes", "delta", "versus"],
    size: "normal",
  },
  {
    id: "regex",
    title: "Regex Tester",
    description: "Test a JavaScript regular expression with live highlighting and groups.",
    intro: "Write a pattern and some test text. Matches are highlighted as you type, with capture groups and a replace preview.",
    category: "test",
    icon: Regex,
    link: "/regex-tester",
    status: "live",
    keywords: ["regex", "regexp", "regular expression", "pattern", "match", "replace", "capture", "groups", "test"],
    size: "normal",
  },
  {
    id: "base64",
    title: "Base64 Encoder / Decoder",
    description: "Encode text to Base64 or decode it back.",
    intro: "Encode text to Base64, or decode Base64 back to text. UTF-8 and URL-safe input are supported.",
    category: "encode",
    icon: Binary,
    link: "/base64-encoder-decoder",
    status: "live",
    keywords: ["base64", "encode", "decode", "b64", "atob", "btoa"],
    size: "wide",
  },
  {
    id: "jwt",
    title: "JWT Encoder / Decoder",
    description: "Decode and verify a JWT, or sign a new one from JSON claims.",
    intro: "Decode a JWT to see its claims and verify the signature, or switch to Encode to sign a new token with a secret or private key.",
    category: "encode",
    icon: KeyRound,
    link: "/jwt",
    status: "live",
    keywords: ["jwt", "token", "jws", "bearer", "decode", "encode", "sign", "verify", "signature", "claims", "oauth", "jwk"],
    size: "normal",
  },
  {
    id: "url",
    title: "URL Encoder / Decoder",
    description: "Percent-encode or decode text, or split a URL into its parts.",
    intro: "Encode or decode percent-escapes, or switch to Parse to see a URL's parts and edit its query parameters.",
    category: "encode",
    icon: Link2,
    link: "/url-encoder-decoder",
    status: "live",
    keywords: ["url", "uri", "percent", "encode", "decode", "escape", "query", "querystring", "params", "parse", "%20"],
    size: "normal",
  },
  {
    id: "timestamp",
    title: "Timestamp Converter",
    description: "Unix time to dates and back, in any time zone.",
    intro: "Paste a Unix timestamp or a date. Every common format shows up at once, in the time zone you pick.",
    category: "convert",
    icon: Clock,
    link: "/timestamp-converter",
    status: "live",
    keywords: ["timestamp", "unix", "epoch", "time", "date", "iso", "8601", "utc", "timezone", "seconds", "milliseconds"],
    size: "normal",
    pair: ["Unix", "Date"],
  },
  {
    id: "hash",
    title: "Hash Generator",
    description: "MD5, SHA-1 and SHA-2 hashes and HMACs of text or files.",
    intro: "Type text or drop a file to see its MD5, SHA-1, SHA-256, SHA-384 and SHA-512 hashes. Paste a checksum to verify a download.",
    category: "generate",
    icon: Fingerprint,
    link: "/hash-generator",
    status: "live",
    keywords: ["hash", "md5", "sha", "sha1", "sha256", "sha512", "checksum", "hmac", "digest", "integrity", "verify"],
    size: "normal",
  },
  {
    id: "uuid",
    title: "UUID Generator",
    description: "Random v4 or time-ordered v7 UUIDs, in bulk. Inspect any UUID.",
    intro: "Generate up to 1,000 UUIDs at once, or paste one to see its version, variant and creation time.",
    category: "generate",
    icon: IdCard,
    link: "/uuid-generator",
    status: "live",
    keywords: ["uuid", "v4", "v7", "random", "id", "identifier", "rfc 9562", "4122", "ulid"],
    size: "normal",
  },
  {
    id: "csv-to-json",
    title: "CSV to JSON",
    description: "Custom delimiters and nested keys.",
    intro: "Paste or open a CSV file. Each row becomes a JSON object keyed by the header row, and dotted headers like address.city become nested objects.",
    category: "convert",
    icon: Sheet,
    link: "/csv-to-json",
    status: "live",
    keywords: ["csv", "json", "tsv", "spreadsheet", "convert"],
    size: "normal",
    pair: ["CSV", "JSON"],
  },
  {
    id: "json-to-csv",
    title: "JSON to CSV",
    description: "Columns detected from your keys.",
    intro: "Paste an object or an array of objects. Nested keys become dotted column names.",
    category: "convert",
    icon: FileJson,
    link: "/json-to-csv",
    status: "live",
    keywords: ["json", "csv", "spreadsheet", "excel", "convert", "table"],
    size: "normal",
    pair: ["JSON", "CSV"],
  },
  {
    id: "xml-to-json",
    title: "XML to JSON",
    description: "From a file or a pasted string.",
    intro: "Paste or open an XML document. The JSON result appears as you type.",
    category: "convert",
    icon: FileCode2,
    link: "/xml-to-json",
    status: "live",
    keywords: ["xml", "json", "convert", "soap", "rss"],
    size: "normal",
    pair: ["XML", "JSON"],
  },
  {
    id: "json-to-xml",
    title: "JSON to XML",
    description: "Readable, indented output.",
    intro: "Paste a JSON object. The XML result appears as you type, indented.",
    category: "convert",
    icon: FileText,
    link: "/json-to-xml",
    status: "live",
    keywords: ["json", "xml", "convert"],
    size: "normal",
    pair: ["JSON", "XML"],
  },
  {
    id: "yaml-to-json",
    title: "YAML to JSON",
    description: "Anchors, merge keys and multiple documents.",
    intro: "Paste or open a YAML file. The JSON result appears as you type, with anchors, aliases and merge keys expanded.",
    category: "convert",
    icon: FileCode2,
    link: "/yaml-to-json",
    status: "live",
    keywords: ["yaml", "yml", "json", "convert", "kubernetes", "k8s", "compose", "config", "openapi"],
    size: "normal",
    pair: ["YAML", "JSON"],
  },
  {
    id: "json-to-yaml",
    title: "JSON to YAML",
    description: "Clean block-style YAML.",
    intro: "Paste a JSON value. The YAML result appears as you type, with strings like \"yes\" quoted so every parser reads them as text.",
    category: "convert",
    icon: FileText,
    link: "/json-to-yaml",
    status: "live",
    keywords: ["json", "yaml", "yml", "convert", "config"],
    size: "normal",
    pair: ["JSON", "YAML"],
  },
  {
    id: "shadcn-theme",
    title: "Shadcn Theme Generator",
    description: "Generate CSS variables for shadcn/ui from a few base colors.",
    intro: "Generate CSS variables for shadcn/ui from a few base colors.",
    category: "design",
    icon: Palette,
    link: "/shadcn-theme-generator",
    status: "soon",
    keywords: ["shadcn", "theme", "css", "variables", "colors", "tailwind"],
    size: "banner",
  },
];

export const getTool = (id: ToolId): Tool => {
  const tool = tools.find((item) => item.id === id);
  if (!tool) throw new Error(`Unknown tool: ${id}`);
  return tool;
};

export const getCategory = (id: CategoryId): Category => categories.find((item) => item.id === id) ?? categories[0];

export const countByCategory = (id: CategoryId) => tools.filter((tool) => tool.category === id).length;

/** Case-insensitive search over title, category and keywords. Title matches rank first. */
export const searchTools = (query: string): Tool[] => {
  const q = query.trim().toLowerCase();
  if (!q) return tools;
  const scored = tools
    .map((tool) => {
      const title = tool.title.toLowerCase();
      let score = 0;
      if (title.startsWith(q)) score = 4;
      else if (title.includes(q)) score = 3;
      else if (tool.keywords.some((keyword) => keyword.startsWith(q))) score = 2;
      else if (getCategory(tool.category).label.toLowerCase().startsWith(q)) score = 1;
      else if (q.split(/\s+/).every((part) => title.includes(part) || tool.keywords.some((k) => k.includes(part)))) score = 1;
      return { tool, score };
    })
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score);
  return scored.map((entry) => entry.tool);
};
