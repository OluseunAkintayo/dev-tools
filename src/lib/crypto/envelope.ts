import { ToolInputError } from "@/lib/toolError";

/**
 * Layout of AES output, so it can be decrypted from the text and key alone:
 *   0-1  "NX"   2  version (1)   3  cipher (1 GCM, 2 CBC)   4  key bytes (16/24/32)
 *   5    key source (0 raw key, 1 PBKDF2-SHA-256 passphrase)
 *   passphrase only: 6-9 iterations (big-endian), 10 salt length n, 11.. salt
 *   then the IV (12 bytes GCM, 16 CBC) and the ciphertext (GCM includes its tag)
 * GCM also authenticates the header.
 */
export const MAGIC = [0x4e, 0x58];
const VERSION = 1;

export type Cipher = "gcm" | "cbc";
export const IV_LENGTH: Record<Cipher, number> = { gcm: 12, cbc: 16 };
export const SALT_LENGTH = 16;
export const MAX_ITERATIONS = 10_000_000;

export interface EnvelopeHeader {
  cipher: Cipher;
  keyBytes: 16 | 24 | 32;
  kdf: { iterations: number; salt: Uint8Array } | null;
}

export interface Envelope {
  header: EnvelopeHeader;
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
  if (bytes.length < ivEnd + 16) return fail("The encrypted text is cut short, so some of it may be missing.");
  return { header: { cipher, keyBytes, kdf }, headerBytes: bytes.slice(0, offset), iv: bytes.slice(offset, ivEnd), data: bytes.slice(ivEnd) };
};
