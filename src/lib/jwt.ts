import { ToolInputError } from "@/lib/toolError";

export interface DecodedJwt {
  header: Record<string, unknown>;
  payload: unknown;
  /** Base64URL signature as it appears in the token. */
  signature: string;
  /** "header.payload", the bytes the signature covers. */
  signingInput: string;
  alg: string;
}

const fail = (message: string): never => {
  throw new ToolInputError({ message });
};

const BASE64URL = /^[A-Za-z0-9_-]*$/;

export const base64UrlToBytes = (value: string): Uint8Array => {
  const base64 = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = base64 + "=".repeat((4 - (base64.length % 4)) % 4);
  return Uint8Array.from(atob(padded), (char) => char.charCodeAt(0));
};

const decodeSegment = (segment: string, name: "header" | "payload"): unknown => {
  if (!BASE64URL.test(segment) || segment.length % 4 === 1) fail(`The ${name} is not valid Base64URL.`);
  let text: string;
  try {
    text = new TextDecoder("utf-8", { fatal: true }).decode(base64UrlToBytes(segment));
  } catch {
    return fail(`The ${name} does not decode to UTF-8 text.`);
  }
  try {
    return JSON.parse(text);
  } catch {
    return fail(`The ${name} decodes, but it is not JSON.`);
  }
};

/** Strip a "Bearer " prefix, quotes and whitespace so pasted headers work. */
export const cleanToken = (input: string) =>
  input
    .trim()
    .replace(/^authorization:\s*/i, "")
    .replace(/^bearer\s+/i, "")
    .replace(/^["']|["']$/g, "")
    .replace(/\s+/g, "");

export const decodeJwt = (input: string): DecodedJwt => {
  const token = cleanToken(input);
  const parts = token.split(".");
  if (parts.length === 5) fail("This is an encrypted token (JWE). Only signed tokens (JWS) can be decoded without the private key.");
  if (parts.length !== 3) fail(`A JWT has 3 parts separated by dots. This one has ${parts.length}.`);

  const header = decodeSegment(parts[0], "header");
  if (typeof header !== "object" || header === null || Array.isArray(header)) return fail("The header must be a JSON object.");
  const payload = decodeSegment(parts[1], "payload");
  if (!BASE64URL.test(parts[2])) fail("The signature is not valid Base64URL.");

  const alg = typeof (header as Record<string, unknown>).alg === "string" ? ((header as Record<string, unknown>).alg as string) : "";
  return { header: header as Record<string, unknown>, payload, signature: parts[2], signingInput: `${parts[0]}.${parts[1]}`, alg };
};

/* ---------- Claims ---------- */

export type TimeState = "valid" | "expired" | "not-yet-valid" | "none";

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];

/** "in 2 hours", "3 days ago". */
export const relativeTime = (seconds: number, now = Date.now() / 1000) => {
  const delta = seconds - now;
  const [unit, size] = UNITS.find(([, size]) => Math.abs(delta) >= size) ?? UNITS[UNITS.length - 1];
  return relative.format(Math.round(delta / size), unit);
};

export const timeState = (payload: unknown, now = Date.now() / 1000): TimeState => {
  if (typeof payload !== "object" || payload === null) return "none";
  const { exp, nbf } = payload as Record<string, unknown>;
  if (typeof nbf === "number" && now < nbf) return "not-yet-valid";
  if (typeof exp === "number") return now >= exp ? "expired" : "valid";
  return "none";
};

/* ---------- Signature verification ---------- */

type Family = "HS" | "RS" | "PS" | "ES" | "EdDSA";

interface AlgSpec {
  family: Family;
  hash?: "SHA-256" | "SHA-384" | "SHA-512";
  curve?: "P-256" | "P-384" | "P-521";
}

const ALGORITHMS: Record<string, AlgSpec> = {
  HS256: { family: "HS", hash: "SHA-256" },
  HS384: { family: "HS", hash: "SHA-384" },
  HS512: { family: "HS", hash: "SHA-512" },
  RS256: { family: "RS", hash: "SHA-256" },
  RS384: { family: "RS", hash: "SHA-384" },
  RS512: { family: "RS", hash: "SHA-512" },
  PS256: { family: "PS", hash: "SHA-256" },
  PS384: { family: "PS", hash: "SHA-384" },
  PS512: { family: "PS", hash: "SHA-512" },
  ES256: { family: "ES", hash: "SHA-256", curve: "P-256" },
  ES384: { family: "ES", hash: "SHA-384", curve: "P-384" },
  ES512: { family: "ES", hash: "SHA-512", curve: "P-521" },
  EdDSA: { family: "EdDSA" },
  Ed25519: { family: "EdDSA" },
};

export const isSymmetric = (alg: string) => ALGORITHMS[alg]?.family === "HS";
export const isSupportedAlg = (alg: string) => alg in ALGORITHMS;

export type SecretEncoding = "utf8" | "base64";

export interface VerifyResult {
  valid: boolean;
  message: string;
}

const HASH_BYTES = { "SHA-256": 32, "SHA-384": 48, "SHA-512": 64 } as const;

const importParams = (spec: AlgSpec): RsaHashedImportParams | EcKeyImportParams | HmacImportParams | Algorithm => {
  switch (spec.family) {
    case "HS":
      return { name: "HMAC", hash: spec.hash! };
    case "RS":
      return { name: "RSASSA-PKCS1-v1_5", hash: spec.hash! };
    case "PS":
      return { name: "RSA-PSS", hash: spec.hash! };
    case "ES":
      return { name: "ECDSA", namedCurve: spec.curve! };
    case "EdDSA":
      return { name: "Ed25519" };
  }
};

const verifyParams = (spec: AlgSpec): AlgorithmIdentifier | RsaPssParams | EcdsaParams => {
  switch (spec.family) {
    case "HS":
      return "HMAC";
    case "RS":
      return "RSASSA-PKCS1-v1_5";
    case "PS":
      return { name: "RSA-PSS", saltLength: HASH_BYTES[spec.hash!] };
    case "ES":
      return { name: "ECDSA", hash: spec.hash! };
    case "EdDSA":
      return "Ed25519";
  }
};

const pemToDer = (pem: string): ArrayBuffer => {
  const body = pem.replace(/-----(BEGIN|END) [A-Z ]+-----/g, "").replace(/\s+/g, "");
  return Uint8Array.from(atob(body), (char) => char.charCodeAt(0)).buffer;
};

class KeyError extends Error {}

/** Pick the JWK to use: by kid when the token names one, else the only key that fits. */
const pickJwk = (value: unknown, header: Record<string, unknown>, spec: AlgSpec): JsonWebKey => {
  const keys = (typeof value === "object" && value !== null && Array.isArray((value as { keys?: unknown }).keys)
    ? (value as { keys: JsonWebKey[] }).keys
    : [value]) as (JsonWebKey & { kid?: string })[];
  const kty = { HS: "oct", RS: "RSA", PS: "RSA", ES: "EC", EdDSA: "OKP" }[spec.family];
  const kid = typeof header.kid === "string" ? header.kid : undefined;
  if (kid) {
    const match = keys.find((key) => key.kid === kid);
    if (match) return match;
    if (keys.length > 1) throw new KeyError(`No key in the set has kid "${kid}".`);
  }
  const fitting = keys.filter((key) => key && key.kty === kty);
  if (fitting.length === 0) throw new KeyError(`This token needs a ${kty} key. The JWK has kty "${keys[0]?.kty ?? "missing"}".`);
  if (fitting.length > 1) throw new KeyError("The key set has several matching keys and the token has no kid. Paste a single key.");
  return fitting[0];
};

const importKey = async (keyText: string, header: Record<string, unknown>, spec: AlgSpec, encoding: SecretEncoding): Promise<CryptoKey> => {
  const text = keyText.trim();
  const params = importParams(spec);

  if (text.startsWith("{")) {
    let parsed: unknown;
    try {
      parsed = JSON.parse(text);
    } catch {
      throw new KeyError("The key looks like JSON but does not parse. Paste a JWK or a JWKS.");
    }
    const jwk = { ...pickJwk(parsed, header, spec) };
    if ("d" in jwk && spec.family !== "HS") throw new KeyError("This JWK is a private key. Paste the public key instead.");
    delete jwk.key_ops;
    delete jwk.alg;
    delete jwk.use;
    return crypto.subtle.importKey("jwk", jwk, params, false, ["verify"]);
  }

  if (spec.family === "HS") {
    let bytes: Uint8Array;
    if (encoding === "base64") {
      if (!/^[A-Za-z0-9+/_-]+=*$/.test(text)) throw new KeyError("The secret is not valid Base64.");
      bytes = base64UrlToBytes(text.replace(/=+$/, ""));
    } else {
      bytes = new TextEncoder().encode(keyText);
    }
    return crypto.subtle.importKey("raw", bytes, params, false, ["verify"]);
  }

  if (/-----BEGIN (RSA |EC |ENCRYPTED )?PRIVATE KEY-----/.test(text)) throw new KeyError("This is a private key. Paste the matching public key instead.");
  if (text.includes("-----BEGIN RSA PUBLIC KEY-----"))
    throw new KeyError('This is a PKCS#1 key. Convert it with "openssl rsa -RSAPublicKey_in -in key.pem -pubout", or paste a JWK.');
  if (text.includes("-----BEGIN CERTIFICATE-----"))
    throw new KeyError('Certificates are not supported. Extract the public key with "openssl x509 -pubkey -noout -in cert.pem".');
  if (!text.includes("-----BEGIN PUBLIC KEY-----")) throw new KeyError("Paste a PEM public key (BEGIN PUBLIC KEY), a JWK or a JWKS.");

  return crypto.subtle.importKey("spki", pemToDer(text), params, false, ["verify"]);
};

export const verifyJwt = async (token: DecodedJwt, keyText: string, encoding: SecretEncoding = "utf8"): Promise<VerifyResult> => {
  const spec = ALGORITHMS[token.alg];
  if (token.alg === "none") return { valid: false, message: 'The token uses alg "none", so it has no signature to verify. Treat it as untrusted.' };
  if (!spec) return { valid: false, message: `Verifying ${token.alg || "tokens without an alg"} is not supported.` };

  let key: CryptoKey;
  try {
    key = await importKey(keyText, token.header, spec, encoding);
  } catch (err) {
    if (err instanceof KeyError) return { valid: false, message: err.message };
    if (spec.family === "EdDSA" && err instanceof Error && err.name === "NotSupportedError")
      return { valid: false, message: "This browser cannot verify Ed25519 signatures." };
    return { valid: false, message: `The key could not be used for ${token.alg}. Check that it matches the algorithm.` };
  }

  try {
    const signature = base64UrlToBytes(token.signature);
    const data = new TextEncoder().encode(token.signingInput);
    const valid = await crypto.subtle.verify(verifyParams(spec), key, signature, data);
    return valid ? { valid: true, message: `Signature verified with ${token.alg}.` } : { valid: false, message: "Invalid signature. The key does not match, or the token was changed." };
  } catch {
    return { valid: false, message: "Invalid signature." };
  }
};
