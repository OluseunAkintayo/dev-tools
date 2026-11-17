import { ToolInputError } from "@/lib/toolError";
import { bytesFromBase64, bytesFromHex, encodeBytes, randomBytes } from "./encoding";
import { IV_LENGTH, MAX_ITERATIONS, packHeader, SALT_LENGTH, unpackEnvelope, type Cipher, type EnvelopeHeader } from "./envelope";

export type KeyBits = 128 | 192 | 256;
export type RawKeyEncoding = "hex" | "base64";

export type AesKey = { kind: "passphrase"; passphrase: string; iterations: number } | { kind: "raw"; text: string; encoding: RawKeyEncoding };

export const ITERATION_OPTIONS = [100_000, 310_000, 600_000, 1_000_000];
export const DEFAULT_ITERATIONS = 600_000;

const fail = (message: string): never => {
  throw new ToolInputError({ message });
};

const NAMES: Record<Cipher, "AES-GCM" | "AES-CBC"> = { gcm: "AES-GCM", cbc: "AES-CBC" };

export const describeCipher = (cipher: Cipher, keyBytes: number) => `AES-${keyBytes * 8}-${cipher.toUpperCase()}`;

export const parseRawKey = (text: string, encoding: RawKeyEncoding): Uint8Array => {
  if (!text.trim()) return fail("Enter a key.");
  return encoding === "hex" ? bytesFromHex(text) : bytesFromBase64(text);
};

export const generateRawKey = (bits: KeyBits, encoding: RawKeyEncoding) => encodeBytes(randomBytes(bits / 8), encoding === "hex" ? "hex" : "base64");

const deriveKey = async (passphrase: string, salt: Uint8Array, iterations: number, cipher: Cipher, keyBytes: number): Promise<CryptoKey> => {
  const material = await crypto.subtle.importKey("raw", new TextEncoder().encode(passphrase), "PBKDF2", false, ["deriveKey"]);
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    material,
    { name: NAMES[cipher], length: keyBytes * 8 },
    false,
    ["encrypt", "decrypt"]
  );
};

const importRaw = (bytes: Uint8Array, cipher: Cipher) => crypto.subtle.importKey("raw", bytes, NAMES[cipher], false, ["encrypt", "decrypt"]);

const requireKeyLength = (bytes: Uint8Array, expected: number) => {
  if (bytes.length !== expected) fail(`The key is ${bytes.length} bytes, but ${expected * 8}-bit AES needs ${expected} bytes (${expected * 2} hex characters).`);
};

export interface AesResult {
  bytes: Uint8Array;
  label: string;
}

export const encryptAes = async (plaintext: string, cipher: Cipher, bits: KeyBits, key: AesKey): Promise<AesResult> => {
  const keyBytes = bits / 8;
  let kdf: EnvelopeHeader["kdf"] = null;
  let cryptoKey: CryptoKey;
  if (key.kind === "passphrase") {
    if (!key.passphrase) return fail("Enter a passphrase.");
    if (key.iterations > MAX_ITERATIONS) return fail("That is too many PBKDF2 iterations.");
    kdf = { iterations: key.iterations, salt: randomBytes(SALT_LENGTH) };
    cryptoKey = await deriveKey(key.passphrase, kdf.salt, kdf.iterations, cipher, keyBytes);
  } else {
    const raw = parseRawKey(key.text, key.encoding);
    requireKeyLength(raw, keyBytes);
    cryptoKey = await importRaw(raw, cipher);
  }
  const header = packHeader({ cipher, keyBytes: keyBytes as 16 | 24 | 32, kdf });
  const iv = randomBytes(IV_LENGTH[cipher]);
  const params = cipher === "gcm" ? { name: "AES-GCM", iv, additionalData: header } : { name: "AES-CBC", iv };
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(params, cryptoKey, new TextEncoder().encode(plaintext)));
  const bytes = new Uint8Array(header.length + iv.length + encrypted.length);
  bytes.set(header, 0);
  bytes.set(iv, header.length);
  bytes.set(encrypted, header.length + iv.length);
  return { bytes, label: describeCipher(cipher, keyBytes) };
};

export const decryptAes = async (bytes: Uint8Array, key: AesKey): Promise<{ text: string; label: string }> => {
  const { header, headerBytes, iv, data } = unpackEnvelope(bytes);
  const label = describeCipher(header.cipher, header.keyBytes);
  let cryptoKey: CryptoKey;
  if (header.kdf) {
    if (key.kind !== "passphrase") return fail("This was encrypted with a passphrase. Switch the key to Passphrase and enter it.");
    if (!key.passphrase) return fail("Enter the passphrase.");
    cryptoKey = await deriveKey(key.passphrase, header.kdf.salt, header.kdf.iterations, header.cipher, header.keyBytes);
  } else {
    if (key.kind !== "raw") return fail("This was encrypted with a raw key. Switch the key to Raw key and enter it.");
    const raw = parseRawKey(key.text, key.encoding);
    requireKeyLength(raw, header.keyBytes);
    cryptoKey = await importRaw(raw, header.cipher);
  }
  const params = header.cipher === "gcm" ? { name: "AES-GCM", iv, additionalData: headerBytes } : { name: "AES-CBC", iv };
  return { text: await decryptToText(params, cryptoKey, data, header.cipher, header.kdf ? "passphrase" : "key"), label };
};

const decryptToText = async (params: AesGcmParams | AesCbcParams, key: CryptoKey, data: Uint8Array, cipher: Cipher, secret: string): Promise<string> => {
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt(params, key, data);
  } catch {
    return fail(
      cipher === "gcm"
        ? `Could not decrypt. The ${secret}, IV or tag is wrong, or the data was changed after it was encrypted.`
        : `Could not decrypt. The ${secret} or IV is probably wrong, or the data was changed after it was encrypted.`
    );
  }
  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(plain);
  } catch {
    return fail("It decrypted, but the result is not valid text. The key is probably wrong.");
  }
};

const GCM_TAG_LENGTHS = [4, 8, 12, 13, 14, 15, 16];
const GCM_TAG_BYTES = 16;

const checkIv = (cipher: Cipher, iv: Uint8Array) => {
  if (cipher === "cbc" && iv.length !== 16) fail(`AES-CBC needs a 16-byte IV, but this one is ${iv.length} bytes.`);
  if (cipher === "gcm" && iv.length === 0) fail("The IV is empty.");
};

export interface AesRawResult {
  iv: Uint8Array;
  data: Uint8Array;
  /** GCM only: the authentication tag, split off the end of the ciphertext. */
  tag: Uint8Array | null;
  label: string;
}

/** Encrypts with a raw key and returns the IV, ciphertext and tag separately. A random IV is made unless one is given. */
export const encryptAesRaw = async (plaintext: string, cipher: Cipher, bits: KeyBits, keyText: string, encoding: RawKeyEncoding, iv: Uint8Array | null): Promise<AesRawResult> => {
  const raw = parseRawKey(keyText, encoding);
  requireKeyLength(raw, bits / 8);
  const vector = iv ?? randomBytes(IV_LENGTH[cipher]);
  checkIv(cipher, vector);
  const key = await importRaw(raw, cipher);
  const params = cipher === "gcm" ? { name: "AES-GCM", iv: vector } : { name: "AES-CBC", iv: vector };
  const encrypted = new Uint8Array(await crypto.subtle.encrypt(params, key, new TextEncoder().encode(plaintext)));
  const label = describeCipher(cipher, raw.length);
  if (cipher === "cbc") return { iv: vector, data: encrypted, tag: null, label };
  return { iv: vector, data: encrypted.slice(0, -GCM_TAG_BYTES), tag: encrypted.slice(-GCM_TAG_BYTES), label };
};

/** Decrypts separate parts. The key size comes from the key. A missing GCM tag is read from the end of the ciphertext. */
export const decryptAesRaw = async (cipher: Cipher, data: Uint8Array, iv: Uint8Array, tag: Uint8Array | null, keyText: string, encoding: RawKeyEncoding): Promise<{ text: string; label: string }> => {
  const raw = parseRawKey(keyText, encoding);
  if (raw.length !== 16 && raw.length !== 24 && raw.length !== 32) {
    return fail(`The key is ${raw.length} bytes, but AES keys are 16, 24 or 32 bytes (32, 48 or 64 hex characters).`);
  }
  checkIv(cipher, iv);
  const key = await importRaw(raw, cipher);
  const label = describeCipher(cipher, raw.length);
  if (cipher === "cbc") {
    return { text: await decryptToText({ name: "AES-CBC", iv }, key, data, cipher, "key"), label };
  }
  if (tag && !GCM_TAG_LENGTHS.includes(tag.length)) return fail(`The tag is ${tag.length} bytes. AES-GCM tags are 16 bytes (or, rarely, 4, 8 or 12 to 15).`);
  const tagBytes = tag ? tag.length : GCM_TAG_BYTES;
  const input = new Uint8Array(data.length + (tag ? tag.length : 0));
  input.set(data, 0);
  if (tag) input.set(tag, data.length);
  if (input.length < tagBytes) return fail("The ciphertext is too short to contain the tag. Paste the tag separately if it was kept apart.");
  return { text: await decryptToText({ name: "AES-GCM", iv, tagLength: tagBytes * 8 }, key, input, cipher, "key"), label };
};
