import { ToolInputError } from "@/lib/toolError";

export type TextFormat = "base64" | "base64url" | "hex";

export const FORMAT_LABELS: Record<TextFormat, string> = { base64: "Base64", base64url: "Base64url", hex: "Hex" };

const fail = (message: string): never => {
  throw new ToolInputError({ message });
};

export const bytesToBase64 = (bytes: Uint8Array): string => {
  let binary = "";
  // Chunked to stay under the argument limit.
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
};

export const bytesToHex = (bytes: Uint8Array): string => Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");

export const encodeBytes = (bytes: Uint8Array, format: TextFormat): string => {
  if (format === "hex") return bytesToHex(bytes);
  const base64 = bytesToBase64(bytes);
  return format === "base64url" ? base64.replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "") : base64;
};

export const bytesFromBase64 = (text: string): Uint8Array => {
  const compact = text.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");
  const unpadded = compact.replace(/=+$/, "");
  if (!/^[A-Za-z0-9+/]*$/.test(unpadded)) return fail("That is not valid Base64. Only A-Z, a-z, 0-9, +, /, - and _ are allowed.");
  if (unpadded.length % 4 === 1) return fail("That is not valid Base64. The length is wrong, so some of it may be missing.");
  const binary = atob(unpadded + "=".repeat((4 - (unpadded.length % 4)) % 4));
  return Uint8Array.from(binary, (char) => char.charCodeAt(0));
};

export const bytesFromHex = (text: string): Uint8Array => {
  const compact = text.replace(/\s+/g, "").replace(/^0x/i, "");
  if (!/^[0-9a-fA-F]*$/.test(compact)) return fail("That is not valid hex. Only 0-9 and a-f are allowed.");
  if (compact.length % 2 === 1) return fail("That is not valid hex. It has an odd number of digits.");
  return Uint8Array.from(compact.match(/../g) ?? [], (pair) => parseInt(pair, 16));
};

export const bytesFrom = (text: string, format: TextFormat): Uint8Array => (format === "hex" ? bytesFromHex(text) : bytesFromBase64(text));

export const decodeCiphertext = (text: string, format: TextFormat, startsWith?: number[]): Uint8Array => {
  // Hex is also valid Base64; the known start tells them apart.
  if (startsWith && format !== "hex" && /^(?:0x)?[0-9a-fA-F\s]+$/.test(text)) {
    try {
      const asHex = bytesFromHex(text);
      if (startsWith.every((byte, index) => asHex[index] === byte)) return asHex;
    } catch {
      // Not hex; read as Base64.
    }
  }
  return bytesFrom(text, format);
};

export const randomBytes = (length: number): Uint8Array => crypto.getRandomValues(new Uint8Array(length));

/** Like bytesFrom, with the field's name in the error. */
export const readField = (label: string, text: string, format: TextFormat): Uint8Array => {
  try {
    return bytesFrom(text, format);
  } catch (err) {
    if (err instanceof ToolInputError) throw new ToolInputError({ message: `${label}: ${err.detail.message}` });
    throw err;
  }
};
