import type { SecretEncoding } from "@/lib/jwt";

export const ENCODING_OPTIONS: { value: SecretEncoding; label: string }[] = [
  { value: "utf8", label: "Text" },
  { value: "base64", label: "Base64" },
];

/** The well-known jwt.io example, signed with HS256 and the secret "your-256-bit-secret". */
export const SAMPLE_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
export const SAMPLE_SECRET = "your-256-bit-secret";

export const KEY_TEXTAREA_CLASS =
  "block w-full resize-none border-t border-line bg-transparent px-4 py-2.5 font-mono text-[13px] leading-6 text-ink-2 caret-brand outline-none placeholder:font-sans placeholder:text-[13px] placeholder:text-ink-3 focus-visible:bg-sunken/40 disabled:opacity-60";
