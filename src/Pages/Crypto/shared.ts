import { FORMAT_LABELS, type TextFormat } from "@/lib/crypto/encoding";
import type { KeyBits, RawKeyEncoding } from "@/lib/crypto/aes";
import type { RsaBits, RsaHash } from "@/lib/crypto/rsa";
import { RSA_HASHES, RSA_SIZES } from "@/lib/crypto/rsa";

export type Mode = "encrypt" | "decrypt";
export type Algorithm = "aes-gcm" | "aes-cbc" | "rsa-oaep";
export type KeySource = "passphrase" | "raw";
export type Layout = "packaged" | "raw";

export const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "encrypt", label: "Encrypt" },
  { value: "decrypt", label: "Decrypt" },
];

export const LAYOUT_OPTIONS: { value: Layout; label: string }[] = [
  { value: "packaged", label: "Packaged" },
  { value: "raw", label: "Raw (IV, tag)" },
];

export const ENCRYPT_ALGORITHMS: { value: Algorithm; label: string }[] = [
  { value: "aes-gcm", label: "AES-GCM" },
  { value: "aes-cbc", label: "AES-CBC" },
  { value: "rsa-oaep", label: "RSA-OAEP" },
];

export const DECRYPT_ALGORITHMS: { value: Algorithm; label: string }[] = [
  { value: "aes-gcm", label: "AES (detected)" },
  { value: "rsa-oaep", label: "RSA-OAEP" },
];

export const FORMAT_OPTIONS = (Object.keys(FORMAT_LABELS) as TextFormat[]).map((value) => ({ value, label: FORMAT_LABELS[value] }));
export const KEY_SIZE_OPTIONS: { value: string; label: string }[] = ([128, 192, 256] as KeyBits[]).map((bits) => ({ value: String(bits), label: `${bits}-bit` }));
export const HASH_OPTIONS = RSA_HASHES.map((hash) => ({ value: hash, label: hash }));
export const RSA_SIZE_OPTIONS = RSA_SIZES.map((bits) => ({ value: String(bits), label: `${bits}-bit` }));

export const SOURCE_OPTIONS: { value: KeySource; label: string }[] = [
  { value: "passphrase", label: "Passphrase" },
  { value: "raw", label: "Raw key" },
];

export const RAW_ENCODING_OPTIONS: { value: RawKeyEncoding; label: string }[] = [
  { value: "hex", label: "Hex" },
  { value: "base64", label: "Base64" },
];

export interface KeyState {
  source: KeySource;
  passphrase: string;
  iterations: number;
  rawKey: string;
  rawEncoding: RawKeyEncoding;
  publicKey: string;
  privateKey: string;
  rsaBits: RsaBits;
}

export const INITIAL_KEYS: KeyState = {
  source: "passphrase",
  passphrase: "",
  iterations: 600_000,
  rawKey: "",
  rawEncoding: "hex",
  publicKey: "",
  privateKey: "",
  rsaBits: 2048,
};

export type KeyUpdate = (patch: Partial<KeyState>) => void;

export const KEY_FIELD_CLASS =
  "block w-full border-t border-line bg-transparent px-4 py-2.5 font-mono text-[13px] leading-6 text-ink-2 caret-brand outline-none placeholder:font-sans placeholder:text-[13px] placeholder:text-ink-3 focus-visible:bg-sunken/40 disabled:opacity-60";

export const asBits = (value: string) => Number(value) as KeyBits;
export const asRsaBits = (value: string) => Number(value) as RsaBits;
export const asHash = (value: string) => value as RsaHash;
