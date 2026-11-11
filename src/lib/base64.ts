export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const normalizeBase64 = (str: string): string => str.replace(/\s+/g, "").replace(/-/g, "+").replace(/_/g, "/");

export function encodeToBase64(text: string): string {
  const utf8Bytes = new TextEncoder().encode(text);
  const binaryString = Array.from(utf8Bytes, (byte) => String.fromCharCode(byte)).join("");
  return btoa(binaryString);
}

export function decodeFromBase64(base64: string): string {
  const normalized = normalizeBase64(base64);
  if (normalized.length === 0) return "";

  const validation = isValidBase64(normalized);
  if (!validation.isValid) throw new Error(validation.error || "Invalid Base64 format");

  const unpadded = normalized.replace(/=+$/, "");
  const padded = unpadded + "=".repeat((4 - (unpadded.length % 4)) % 4);
  const binaryString = atob(padded);
  const bytes = Uint8Array.from(binaryString, (char) => char.charCodeAt(0));

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
  } catch {
    throw new Error("The decoded data is not valid UTF-8 text. The Base64 string may contain binary data or be corrupted.");
  }
}

export function isValidBase64(str: string): ValidationResult {
  const normalized = normalizeBase64(str);
  if (normalized.length === 0) return { isValid: true };

  if (!/^[A-Za-z0-9+/]*={0,2}$/.test(normalized)) {
    return {
      isValid: false,
      error: "Invalid Base64 format. Only A-Z, a-z, 0-9, +, /, -, _ and trailing = characters are allowed",
    };
  }

  const unpadded = normalized.replace(/=+$/, "");
  if (unpadded.length % 4 === 1) {
    return { isValid: false, error: "Invalid Base64 format. The input has the wrong length" };
  }

  if (normalized.length !== unpadded.length && normalized.length % 4 !== 0) {
    return { isValid: false, error: "Invalid Base64 format. The padding is incorrect" };
  }

  return { isValid: true };
}

export function validateTextInput(text: string): ValidationResult {
  if (!text || text.trim().length === 0) {
    return { isValid: false, error: "Please enter text to encode" };
  }
  return { isValid: true };
}

export function validateBase64Input(base64: string): ValidationResult {
  if (!base64 || base64.trim().length === 0) {
    return { isValid: false, error: "Please enter Base64 text to decode" };
  }
  return isValidBase64(base64);
}
