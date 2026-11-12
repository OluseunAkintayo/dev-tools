import { ToolInputError } from "@/lib/toolError";

/** UUIDs per RFC 9562 (which replaced RFC 4122 in 2024). */

const HEX = Array.from({ length: 256 }, (_, i) => i.toString(16).padStart(2, "0"));

const toHex = (bytes: Uint8Array) => {
  let out = "";
  for (let i = 0; i < 16; i++) out += HEX[bytes[i]];
  return `${out.slice(0, 8)}-${out.slice(8, 12)}-${out.slice(12, 16)}-${out.slice(16, 20)}-${out.slice(20)}`;
};

/** Random v4. Uses getRandomValues, which unlike randomUUID also works outside HTTPS. */
export const uuidV4 = () => {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  return toHex(bytes);
};

/**
 * Time-ordered v7: 48-bit Unix milliseconds, then a 12-bit counter, then random bits.
 * UUIDs from one generator always sort in creation order, even within one millisecond
 * (RFC 9562 §6.2, method 1). When the counter runs out the timestamp moves ahead by 1 ms.
 */
export const createV7Generator = (now: () => number = Date.now) => {
  let lastMs = -1;
  let counter = 0;
  return () => {
    let ms = now();
    if (ms <= lastMs) {
      ms = lastMs;
      counter += 1;
      if (counter > 0xfff) {
        ms += 1;
        counter = crypto.getRandomValues(new Uint16Array(1))[0] & 0x7ff;
      }
    } else {
      // Start in the lower half so a burst has room to count up.
      counter = crypto.getRandomValues(new Uint16Array(1))[0] & 0x7ff;
    }
    lastMs = ms;

    const bytes = crypto.getRandomValues(new Uint8Array(16));
    // 48-bit big-endian timestamp (2^48 ms is past the year 10000).
    const high = Math.floor(ms / 2 ** 32);
    const low = ms >>> 0;
    bytes[0] = (high >>> 8) & 0xff;
    bytes[1] = high & 0xff;
    bytes[2] = (low >>> 24) & 0xff;
    bytes[3] = (low >>> 16) & 0xff;
    bytes[4] = (low >>> 8) & 0xff;
    bytes[5] = low & 0xff;
    bytes[6] = 0x70 | ((counter >>> 8) & 0x0f);
    bytes[7] = counter & 0xff;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return toHex(bytes);
  };
};

export interface UuidFormat {
  uppercase: boolean;
  hyphens: boolean;
  braces: boolean;
}

export const formatUuid = (uuid: string, { uppercase, hyphens, braces }: UuidFormat) => {
  let out = hyphens ? uuid : uuid.replace(/-/g, "");
  if (uppercase) out = out.toUpperCase();
  return braces ? `{${out}}` : out;
};

/* ---------- Inspecting ---------- */

export interface UuidField {
  label: string;
  value: string;
}

export interface UuidInfo {
  /** Canonical lowercase, hyphenated form. */
  canonical: string;
  version: number | null;
  summary: string;
  fields: UuidField[];
}

const VERSION_NAMES: Record<number, string> = {
  1: "Version 1, time and node (MAC address)",
  2: "Version 2, DCE security",
  3: "Version 3, name-based with MD5",
  4: "Version 4, random",
  5: "Version 5, name-based with SHA-1",
  6: "Version 6, reordered time",
  7: "Version 7, Unix time and random",
  8: "Version 8, custom layout",
};

/** 100 ns intervals between 1582-10-15 (the Gregorian epoch of v1 and v6) and 1970-01-01. */
const GREGORIAN_OFFSET = 122_192_928_000_000_000n;

const gregorianToIso = (ticks: bigint) => {
  const ms = Number((ticks - GREGORIAN_OFFSET) / 10_000n);
  return Math.abs(ms) <= 8.64e15 ? new Date(ms).toISOString() : "Out of range";
};

const fail = (message: string): never => {
  throw new ToolInputError({ message });
};

/** Read any common UUID spelling: hyphens or not, braces, urn:uuid:, any case. */
export const inspectUuid = (input: string): UuidInfo => {
  const text = input.trim().replace(/^urn:uuid:/i, "").replace(/^\{(.*)\}$/, "$1");
  const hex = text.replace(/-/g, "").toLowerCase();
  const hyphenated = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(text);
  if (!/^[0-9a-f]{32}$/.test(hex) || (text.includes("-") && !hyphenated)) {
    fail(`A UUID is 32 hex digits, usually grouped 8-4-4-4-12. This has ${hex.replace(/[^0-9a-f]/g, "").length} hex digits${/[^0-9a-f]/.test(hex) ? " and other characters" : ""}.`);
  }
  const canonical = `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;

  if (/^0+$/.test(hex)) return { canonical, version: null, summary: "Nil UUID (all zeros)", fields: [{ label: "Meaning", value: "A placeholder for “no UUID”." }] };
  if (/^f+$/.test(hex)) return { canonical, version: null, summary: "Max UUID (all ones)", fields: [{ label: "Meaning", value: "A sentinel value defined in RFC 9562." }] };

  const variantNibble = parseInt(hex[16], 16);
  const variant =
    variantNibble < 8 ? "NCS (reserved, pre-1990)" : variantNibble < 12 ? "RFC 9562" : variantNibble < 14 ? "Microsoft (reserved, GUID)" : "Reserved for future use";
  const standard = variantNibble >= 8 && variantNibble < 12;
  const version = parseInt(hex[12], 16);

  const fields: UuidField[] = [
    { label: "Canonical form", value: canonical },
    { label: "Variant", value: variant },
    { label: "Version", value: standard ? VERSION_NAMES[version] ?? `${version} (not defined)` : "Not defined for this variant" },
  ];

  if (standard && version === 7) {
    const ms = parseInt(hex.slice(0, 12), 16);
    fields.push({ label: "Created (UTC)", value: new Date(ms).toISOString() }, { label: "Unix milliseconds", value: String(ms) });
  }
  if (standard && (version === 1 || version === 6)) {
    const ticks =
      version === 1
        ? (BigInt(`0x${hex.slice(13, 16)}`) << 48n) | (BigInt(`0x${hex.slice(8, 12)}`) << 32n) | BigInt(`0x${hex.slice(0, 8)}`)
        : (BigInt(`0x${hex.slice(0, 8)}`) << 28n) | (BigInt(`0x${hex.slice(8, 12)}`) << 12n) | BigInt(`0x${hex.slice(13, 16)}`);
    const node = hex.slice(20).match(/../g)!.join(":");
    const randomNode = (parseInt(hex.slice(20, 22), 16) & 1) === 1;
    fields.push(
      { label: "Created (UTC)", value: gregorianToIso(ticks) },
      { label: "Clock sequence", value: String(parseInt(hex.slice(16, 20), 16) & 0x3fff) },
      { label: randomNode ? "Node (random, multicast bit set)" : "Node (MAC address)", value: node }
    );
  }

  return { canonical, version: standard ? version : null, summary: standard ? VERSION_NAMES[version] ?? `Version ${version}` : variant, fields };
};
