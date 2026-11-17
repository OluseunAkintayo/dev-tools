import { ToolInputError } from "@/lib/toolError";

export type RsaHash = "SHA-256" | "SHA-384" | "SHA-512";
export type RsaBits = 2048 | 3072 | 4096;

export const RSA_HASHES: RsaHash[] = ["SHA-256", "SHA-384", "SHA-512"];
export const RSA_SIZES: RsaBits[] = [2048, 3072, 4096];

const HASH_BYTES: Record<RsaHash, number> = { "SHA-256": 32, "SHA-384": 48, "SHA-512": 64 };

const fail = (message: string): never => {
  throw new ToolInputError({ message });
};

type KeyKind = "public" | "private";

const pemToDer = (pem: string): Uint8Array => {
  const body = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
  try {
    return Uint8Array.from(atob(body), (char) => char.charCodeAt(0));
  } catch {
    return fail("The PEM key could not be read. Check that all of it was copied.");
  }
};

const derToPem = (der: ArrayBuffer, label: "PUBLIC KEY" | "PRIVATE KEY") => {
  const base64 = btoa(String.fromCharCode(...new Uint8Array(der)));
  return `-----BEGIN ${label}-----\n${base64.match(/.{1,64}/g)!.join("\n")}\n-----END ${label}-----`;
};

const readKey = (text: string): { format: "jwk"; jwk: JsonWebKey; kind: KeyKind } | { format: "spki" | "pkcs8"; der: Uint8Array; kind: KeyKind } => {
  const trimmed = text.trim();
  if (!trimmed) return fail("Paste a key.");
  if (trimmed.startsWith("{")) {
    let jwk: JsonWebKey;
    try {
      jwk = JSON.parse(trimmed);
    } catch {
      return fail("That looks like a JWK but is not valid JSON.");
    }
    if (jwk.kty !== "RSA") return fail("That JWK is not an RSA key.");
    return { format: "jwk", jwk, kind: jwk.d ? "private" : "public" };
  }
  if (/BEGIN RSA (PUBLIC|PRIVATE) KEY/.test(trimmed)) {
    return fail("That key is in the older PKCS#1 format, which the browser can't read. Convert it: openssl pkey -in key.pem -out key-pkcs8.pem (private) or openssl pkey -pubin -in pub.pem -out pub-spki.pem (public).");
  }
  if (/BEGIN ENCRYPTED PRIVATE KEY/.test(trimmed)) return fail("That private key is password-protected. Remove the password first: openssl pkey -in key.pem -out key-plain.pem");
  if (/BEGIN PUBLIC KEY/.test(trimmed)) return { format: "spki", der: pemToDer(trimmed), kind: "public" };
  if (/BEGIN PRIVATE KEY/.test(trimmed)) return { format: "pkcs8", der: pemToDer(trimmed), kind: "private" };
  return fail("That is not a key. Paste a PEM (-----BEGIN PUBLIC KEY----- or -----BEGIN PRIVATE KEY-----) or a JWK.");
};

const importKey = async (text: string, hash: RsaHash, want: KeyKind): Promise<CryptoKey> => {
  const key = readKey(text);
  const params = { name: "RSA-OAEP", hash };
  try {
    if (want === "private") {
      if (key.kind !== "private") return fail("That is a public key. Decrypting needs the private key.");
      return key.format === "jwk"
        ? await crypto.subtle.importKey("jwk", { ...key.jwk, alg: undefined, key_ops: undefined, use: undefined, ext: undefined }, params, false, ["decrypt"])
        : await crypto.subtle.importKey("pkcs8", key.der, params, false, ["decrypt"]);
    }
    if (key.format === "jwk") {
      const { kty, n, e } = key.jwk;
      return await crypto.subtle.importKey("jwk", { kty, n, e }, params, false, ["encrypt"]);
    }
    if (key.kind === "private") {
      const extractable = await crypto.subtle.importKey("pkcs8", key.der, params, true, ["decrypt"]);
      const { kty, n, e } = await crypto.subtle.exportKey("jwk", extractable);
      return await crypto.subtle.importKey("jwk", { kty, n, e }, params, false, ["encrypt"]);
    }
    return await crypto.subtle.importKey("spki", key.der, params, false, ["encrypt"]);
  } catch (err) {
    if (err instanceof ToolInputError) throw err;
    return fail("The browser could not use that key. Check that it is a complete RSA key.");
  }
};

export const maxRsaBytes = (bits: number, hash: RsaHash) => bits / 8 - 2 * HASH_BYTES[hash] - 2;

export const encryptRsa = async (plaintext: string, publicKey: string, hash: RsaHash): Promise<{ bytes: Uint8Array; label: string }> => {
  const key = await importKey(publicKey, hash, "public");
  const bits = (key.algorithm as RsaHashedKeyAlgorithm).modulusLength;
  const data = new TextEncoder().encode(plaintext);
  const max = maxRsaBytes(bits, hash);
  if (data.length > max) {
    return fail(`RSA-OAEP can encrypt at most ${max} bytes with a ${bits}-bit key and ${hash}, and this text is ${data.length}. Use AES for longer text.`);
  }
  return { bytes: new Uint8Array(await crypto.subtle.encrypt({ name: "RSA-OAEP" }, key, data)), label: `RSA-${bits} OAEP, ${hash}` };
};

export const decryptRsa = async (bytes: Uint8Array, privateKey: string, hash: RsaHash): Promise<{ text: string; label: string }> => {
  const key = await importKey(privateKey, hash, "private");
  const bits = (key.algorithm as RsaHashedKeyAlgorithm).modulusLength;
  if (bytes.length !== bits / 8) {
    return fail(`This key is ${bits} bits, so the encrypted data should be ${bits / 8} bytes, but it is ${bytes.length}. It may belong to a different key or be cut short.`);
  }
  let plain: ArrayBuffer;
  try {
    plain = await crypto.subtle.decrypt({ name: "RSA-OAEP" }, key, bytes);
  } catch {
    return fail(`Could not decrypt. The private key does not match, the hash (${hash}) is different from the one used to encrypt, or the data was changed.`);
  }
  try {
    return { text: new TextDecoder("utf-8", { fatal: true }).decode(plain), label: `RSA-${bits} OAEP, ${hash}` };
  } catch {
    return fail("It decrypted, but the result is not valid text.");
  }
};

export const generateRsaPair = async (bits: RsaBits, hash: RsaHash): Promise<{ publicKey: string; privateKey: string }> => {
  const pair = await crypto.subtle.generateKey({ name: "RSA-OAEP", modulusLength: bits, publicExponent: new Uint8Array([1, 0, 1]), hash }, true, ["encrypt", "decrypt"]);
  return {
    publicKey: derToPem(await crypto.subtle.exportKey("spki", pair.publicKey), "PUBLIC KEY"),
    privateKey: derToPem(await crypto.subtle.exportKey("pkcs8", pair.privateKey), "PRIVATE KEY"),
  };
};
