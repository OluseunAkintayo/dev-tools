import { hmacMd5, Md5 } from "@/lib/md5";

export const HASH_ALGORITHMS = ["MD5", "SHA-1", "SHA-256", "SHA-384", "SHA-512"] as const;
export type HashAlgorithm = (typeof HASH_ALGORITHMS)[number];

/** Collision attacks are practical against these, so they are only fit for checksums. */
export const WEAK_ALGORITHMS = new Set<HashAlgorithm>(["MD5", "SHA-1"]);

export type DigestFormat = "hex" | "HEX" | "base64";

export type Digests = Record<HashAlgorithm, Uint8Array>;

/** Every algorithm over the same bytes. With a key, each one becomes HMAC-<algorithm>. */
export const digestAll = async (data: Uint8Array, key?: Uint8Array): Promise<Digests> => {
  const sha = HASH_ALGORITHMS.filter((alg) => alg !== "MD5");
  const shaDigests = await Promise.all(
    sha.map(async (alg) => {
      if (!key) return new Uint8Array(await crypto.subtle.digest(alg, data));
      // An empty HMAC key is valid per RFC 2104, but Web Crypto rejects it; a block of zeros is equivalent.
      const raw = key.length ? key : new Uint8Array(1);
      const cryptoKey = await crypto.subtle.importKey("raw", raw, { name: "HMAC", hash: alg }, false, ["sign"]);
      return new Uint8Array(await crypto.subtle.sign("HMAC", cryptoKey, data));
    })
  );
  const md5 = key ? hmacMd5(key, data) : new Md5().update(data).digest();
  return Object.fromEntries([["MD5", md5], ...sha.map((alg, i) => [alg, shaDigests[i]])]) as Digests;
};

export const formatDigest = (bytes: Uint8Array, format: DigestFormat): string => {
  if (format === "base64") {
    let binary = "";
    for (let i = 0; i < bytes.length; i++) binary += String.fromCharCode(bytes[i]);
    return btoa(binary);
  }
  const hex = Array.from(bytes, (byte) => byte.toString(16).padStart(2, "0")).join("");
  return format === "HEX" ? hex.toUpperCase() : hex;
};

/**
 * Which algorithm produced `expected`, if any. Accepts hex in either case or Base64,
 * and ignores spaces and a "sha256:" style prefix, as checksum files often add them.
 */
export const findMatch = (digests: Digests, expected: string): HashAlgorithm | null => {
  const cleaned = expected.trim().replace(/^[a-z0-9-]+[:=]\s*/i, "").replace(/\s+/g, "");
  if (!cleaned) return null;
  return (
    HASH_ALGORITHMS.find((alg) => {
      const bytes = digests[alg];
      return cleaned.toLowerCase() === formatDigest(bytes, "hex") || cleaned.replace(/=+$/, "") === formatDigest(bytes, "base64").replace(/=+$/, "");
    }) ?? null
  );
};

/** Messages between useHashes and hash.worker.ts. */
export type HashWorkerRequest = { file: File; key?: Uint8Array };
export type HashWorkerResponse = { type: "progress"; loaded: number } | { type: "done"; digests: Digests } | { type: "error"; message: string };

export type KeyEncoding = "text" | "hex";

/** HMAC key bytes. Throws with a readable message for malformed hex. */
export const keyBytes = (key: string, encoding: KeyEncoding): Uint8Array => {
  if (encoding === "text") return new TextEncoder().encode(key);
  const hex = key.replace(/\s+/g, "").replace(/^0x/i, "");
  if (!/^(?:[0-9a-f]{2})*$/i.test(hex)) throw new Error("The key is not valid hex. Use pairs of 0–9 and a–f, e.g. 0b0b0b.");
  return Uint8Array.from(hex.match(/../g) ?? [], (pair) => parseInt(pair, 16));
};

/** Files larger than this are refused: Web Crypto needs the whole file in memory. */
export const MAX_FILE_BYTES = 1024 * 1024 * 1024;
