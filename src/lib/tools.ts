import type { LucideIcon } from "lucide-react";
import { ArrowLeftRight, Binary, Braces, FileCode2, FileJson, FileText, Palette, Sheet, WandSparkles } from "lucide-react";

export type CategoryId = "format" | "convert" | "generate" | "encode" | "design";

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
  { id: "design", label: "Design", icon: Palette },
];

export type ToolId =
  | "json-formatter"
  | "json-to-interface"
  | "base64"
  | "csv-to-json"
  | "json-to-csv"
  | "xml-to-json"
  | "json-to-xml"
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
    id: "csv-to-json",
    title: "CSV to JSON",
    description: "Custom delimiters and nested keys.",
    intro: "Paste or open a CSV file. Each row becomes a JSON object keyed by the header row.",
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
