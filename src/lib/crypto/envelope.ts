import { ToolInputError } from "@/lib/toolError";

/**
 * The layout of text encrypted with a passphrase or key (AES). Everything needed to decrypt
 * it, other than the key itself, is in the first bytes, so a ciphertext can be decrypted on its own.
 *
 *   0-1  "NX"
 *   2    version (1)
 *   3    cipher: 1 = AES-GCM, 2 = AES-CBC
 *   4    key length in bytes: 16, 24 or 32
 *   5    key source: 0 = a raw key, 1 = PBKDF2-SHA-256 from a passphrase
 *   6-9  PBKDF2 iterations, big-endian   (passphrase only)
 *   10   salt length n                   (passphrase only)
 *   11.. salt, n bytes                   (passphrase only)
 *   then the IV (12 bytes for GCM, 16 for CBC), then the ciphertext (GCM includes its 16-byte tag)
 *
 * For GCM the header is also authenticated, so changing it makes decryption fail.
 */
export const MAGIC = [0x4e, 0x58];
const VERSION = 1;

export type Cipher = "gcm" | "cbc";
export const IV_LENGTH: Record<Cipher, number> = { gcm: 12, cbc: 16 };
export const SALT_LENGTH = 16;
/** Guards against a pasted header that asks for billions of iterations. */
export const MAX_ITERATIONS = 10_000_000;

export interface EnvelopeHeader {
  cipher: Cipher;
  keyBytes: 16 | 24 | 32;
  /** Present when the key came from a passphrase. */
  kdf: { iterations: number; salt: Uint8Array } | null;
}

export interface Envelope {
  header: EnvelopeHeader;
  /** The header exactly as read, for GCM to authenticate. */
  headerBytes: Uint8Array;
  iv: Uint8Array;
  data: Uint8Array;
}

const fail = (message: string): never => {
  throw new ToolInputError({ message });
};

export const packHeader = ({ cipher, keyBytes, kdf }: EnvelopeHeader): Uint8Array => {
  const bytes = [...MAGIC, VERSION, cipher === "gcm" ? 1 : 2, keyBytes, kdf ? 1 : 0];
  if (kdf) {
    const { iterations, salt } = kdf;
    bytes.push((iterations >>> 24) & 0xff, (iterations >>> 16) & 0xff, (iterations >>> 8) & 0xff, iterations & 0xff, salt.length, ...salt);
  }
  return Uint8Array.from(bytes);
};

export const unpackEnvelope = (bytes: Uint8Array): Envelope => {
  if (bytes.length < 6 || !MAGIC.every((byte, index) => bytes[index] === byte)) {
    return fail("This was not encrypted here, so its settings are unknown. Only text from the Encrypt mode of this tool (AES) can be decrypted with a key. For RSA, choose RSA-OAEP.");
  }
  if (bytes[2] !== VERSION) return fail(`This uses format version ${bytes[2]}, which this tool does not know.`);
  const cipher: Cipher | null = bytes[3] === 1 ? "gcm" : bytes[3] === 2 ? "cbc" : null;
  if (!cipher) return fail("The encrypted text has an unknown cipher, so it may be damaged.");
  const keyBytes = bytes[4];
  if (keyBytes !== 16 && keyBytes !== 24 && keyBytes !== 32) return fail("The encrypted text has an invalid key length, so it may be damaged.");
  let offset = 6;
  let kdf: EnvelopeHeader["kdf"] = null;
  if (bytes[5] === 1) {
    if (bytes.length < 11) return fail("The encrypted text is cut short, so some of it may be missing.");
    const iterations = ((bytes[6] << 24) | (bytes[7] << 16) | (bytes[8] << 8) | bytes[9]) >>> 0;
    const saltLength = bytes[10];
    if (iterations < 1 || iterations > MAX_ITERATIONS) return fail("The encrypted text asks for an unreasonable number of PBKDF2 iterations, so it may be damaged.");
    offset = 11 + saltLength;
    if (bytes.length < offset) return fail("The encrypted text is cut short, so some of it may be missing.");
    kdf = { iterations, salt: bytes.slice(11, offset) };
  } else if (bytes[5] !== 0) {
    return fail("The encrypted text has an unknown key type, so it may be damaged.");
  }
  const ivEnd = offset + IV_LENGTH[cipher];
  // At least the GCM tag, or one CBC block.
  if (bytes.length < ivEnd + 16) return fail("The encrypted text is cut short, so some of it may be missing.");
  return { header: { cipher, keyBytes, kdf }, headerBytes: bytes.slice(0, offset), iv: bytes.slice(offset, ivEnd), data: bytes.slice(ivEnd) };
};
