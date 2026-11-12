import X2JS from "x2js";
import { formatXml } from "@/lib/formatXml";
import { parseJson, ToolInputError } from "@/lib/toolError";
import { isPlainObject } from "@/lib/utils";

/** Convert an XML document to formatted JSON, with a located error for invalid XML. */
export const xmlToJson = (text: string) => {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  const parserError = doc.getElementsByTagName("parsererror")[0];
  if (parserError) {
    const detail = parserError.textContent ?? "";
    const location = /line (?:number )?(\d+)(?:,? at column (\d+)| column (\d+))?/i.exec(detail);
    const line = location ? Number(location[1]) : undefined;
    const column = location ? Number(location[2] ?? location[3]) || undefined : undefined;
    throw new ToolInputError({
      message: line ? `Invalid XML near line ${line}${column ? `, column ${column}` : ""}. Check for unclosed or mismatched tags.` : "Invalid XML. Check for unclosed or mismatched tags.",
      line,
      column,
    });
  }
  return JSON.stringify(new X2JS().dom2js(doc), null, 2);
};

/** Convert a JSON object to indented XML. */
export const jsonToXml = (text: string) => {
  const value = parseJson(text);
  if (!isPlainObject(value)) {
    throw new Error('JSON must be an object, for example {"root": {...}}.');
  }
  // XML needs exactly one root element. Several top-level keys, or a single key
  // holding an array, would produce several sibling roots, so wrap them.
  const keys = Object.keys(value);
  const hasSingleRoot = keys.length === 1 && !Array.isArray(value[keys[0]]);
  return formatXml(new X2JS().js2xml(hasSingleRoot ? value : { root: value }));
};
