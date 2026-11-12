import { ToolInputError } from "@/lib/toolError";

/* ---------- Relative time ---------- */

const relative = new Intl.RelativeTimeFormat(undefined, { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 31_536_000],
  ["month", 2_592_000],
  ["day", 86_400],
  ["hour", 3_600],
  ["minute", 60],
  ["second", 1],
];

/** "in 2 hours", "3 days ago". Both arguments are Unix seconds. */
export const relativeTime = (seconds: number, now = Date.now() / 1000) => {
  const delta = seconds - now;
  const [unit, size] = UNITS.find(([, size]) => Math.abs(delta) >= size) ?? UNITS[UNITS.length - 1];
  return relative.format(Math.round(delta / size), unit);
};

/* ---------- Time zones ---------- */

/**
 * Browsers list zones from ICU/CLDR, which keeps some pre-rename IDs (Asia/Calcutta,
 * Europe/Kiev). Intl accepts the current IANA names too, so the picker uses those and
 * keeps the old name as a search keyword.
 */
const RENAMED_ZONES: Record<string, string> = {
  "Africa/Asmera": "Africa/Asmara",
  "America/Buenos_Aires": "America/Argentina/Buenos_Aires",
  "America/Catamarca": "America/Argentina/Catamarca",
  "America/Coral_Harbour": "America/Atikokan",
  "America/Cordoba": "America/Argentina/Cordoba",
  "America/Godthab": "America/Nuuk",
  "America/Indianapolis": "America/Indiana/Indianapolis",
  "America/Jujuy": "America/Argentina/Jujuy",
  "America/Louisville": "America/Kentucky/Louisville",
  "America/Mendoza": "America/Argentina/Mendoza",
  "Asia/Calcutta": "Asia/Kolkata",
  "Asia/Katmandu": "Asia/Kathmandu",
  "Asia/Rangoon": "Asia/Yangon",
  "Asia/Saigon": "Asia/Ho_Chi_Minh",
  "Atlantic/Faeroe": "Atlantic/Faroe",
  "Europe/Kiev": "Europe/Kyiv",
  "Pacific/Enderbury": "Pacific/Kanton",
  "Pacific/Ponape": "Pacific/Pohnpei",
  "Pacific/Truk": "Pacific/Chuuk",
};
const FORMER_NAMES = Object.fromEntries(Object.entries(RENAMED_ZONES).map(([old, current]) => [current, old]));

/** The current IANA name for a zone ID that may be a legacy alias. */
const currentZoneName = (timeZone: string) => RENAMED_ZONES[timeZone] ?? timeZone;

export const localTimeZone = () => currentZoneName(Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC");

/** Every IANA zone the browser knows, with UTC and the local zone first. */
export const timeZoneList = (): string[] => {
  const local = localTimeZone();
  // Not in this project's TypeScript lib target (ES2022+), but in every current browser.
  const supportedValuesOf = (Intl as unknown as { supportedValuesOf?: (key: "timeZone") => string[] }).supportedValuesOf;
  const all = typeof supportedValuesOf === "function" ? supportedValuesOf("timeZone").map(currentZoneName) : [];
  return Array.from(new Set(["UTC", local, ...all]));
};

/**
 * IANA IDs use underscores because they cannot contain spaces ("America/New_York").
 * The ID must be passed to Intl unchanged, so only the display swaps them for spaces.
 */
export const timeZoneLabel = (timeZone: string) => timeZone.replace(/_/g, " ");

export interface TimeZoneOption {
  value: string;
  label: string;
  /** Current offset, e.g. "UTC+05:30". */
  hint: string;
  /** Extra text to match when searching, e.g. "+0530 +5:30". */
  keywords: string;
}

/** Zones for the picker, each with its offset at `now` so users can search by offset. */
export const timeZoneOptions = (now = Date.now()): TimeZoneOption[] => {
  const local = localTimeZone();
  return timeZoneList().map((zone) => {
    const offset = zoneOffsetMinutes(now, zone);
    const hint = offset === 0 ? "UTC+00:00" : `UTC${formatOffset(offset)}`;
    const hours = Math.floor(Math.abs(offset) / 60);
    const sign = offset < 0 ? "-" : "+";
    return {
      value: zone,
      label: zone === local && zone !== "UTC" ? `${timeZoneLabel(zone)} (local)` : timeZoneLabel(zone),
      hint,
      keywords: [
        timeZoneLabel(FORMER_NAMES[zone] ?? ""),
        formatOffset(offset, ""),
        `${sign}${hours}${offset % 60 ? `:${String(Math.abs(offset) % 60).padStart(2, "0")}` : ""}`,
        zone === local ? "local" : "",
      ].join(" "),
    };
  });
};

interface ZonedFields {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  second: number;
  weekday: string;
}

const partsFormatters = new Map<string, Intl.DateTimeFormat>();
const partsFormatter = (timeZone: string) => {
  let formatter = partsFormatters.get(timeZone);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat("en-US", {
      timeZone,
      hourCycle: "h23",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      weekday: "short",
      era: "short",
    });
    partsFormatters.set(timeZone, formatter);
  }
  return formatter;
};

/** Wall-clock fields of an instant in a time zone. */
const zonedFields = (ms: number, timeZone: string): ZonedFields => {
  const parts = Object.fromEntries(partsFormatter(timeZone).formatToParts(new Date(ms)).map((part) => [part.type, part.value]));
  const year = Number(parts.year);
  return {
    // Years before 1 AD come back as positive years with era "BC".
    year: parts.era === "BC" || parts.era === "B" ? 1 - year : year,
    month: Number(parts.month),
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    second: Number(parts.second),
    weekday: parts.weekday,
  };
};

const utcFromFields = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0, millisecond = 0) => {
  const date = new Date(Date.UTC(2000, month - 1, day, hour, minute, second, millisecond));
  date.setUTCFullYear(year); // Date.UTC maps years 0–99 to 1900–1999.
  return date.getTime();
};

/** Minutes the zone is ahead of UTC at this instant, e.g. 60 for Africa/Lagos. */
export const zoneOffsetMinutes = (ms: number, timeZone: string) => {
  const whole = Math.floor(ms / 1000) * 1000;
  const f = zonedFields(whole, timeZone);
  return Math.round((utcFromFields(f.year, f.month, f.day, f.hour, f.minute, f.second) - whole) / 60_000);
};

/** Wall-clock time in a zone to an instant. Handles DST by re-checking the offset. */
const zonedToUtc = (year: number, month: number, day: number, hour: number, minute: number, second: number, millisecond: number, timeZone: string) => {
  const guess = utcFromFields(year, month, day, hour, minute, second, millisecond);
  const first = guess - zoneOffsetMinutes(guess, timeZone) * 60_000;
  return guess - zoneOffsetMinutes(first, timeZone) * 60_000;
};

const formatOffset = (minutes: number, separator = ":") => {
  const sign = minutes < 0 ? "-" : "+";
  const abs = Math.abs(minutes);
  return `${sign}${String(Math.floor(abs / 60)).padStart(2, "0")}${separator}${String(abs % 60).padStart(2, "0")}`;
};

/* ---------- Parsing ---------- */

export type TimestampUnit = "auto" | "s" | "ms" | "us" | "ns";

export type InputKind = "seconds" | "milliseconds" | "microseconds" | "nanoseconds" | "date" | "now";

export interface ParsedTimestamp {
  /** Unix time in milliseconds. */
  ms: number;
  kind: InputKind;
  /** How the input was read, when that is worth pointing out. */
  note?: string;
}

/** Largest instant a JS Date can hold: ±100,000,000 days from 1970. */
const MAX_MS = 8.64e15;

const UNIT_DIVISOR: Record<Exclude<TimestampUnit, "auto">, number> = { s: 1e-3, ms: 1, us: 1e3, ns: 1e6 };
const UNIT_KIND: Record<Exclude<TimestampUnit, "auto">, InputKind> = { s: "seconds", ms: "milliseconds", us: "microseconds", ns: "nanoseconds" };

/** Pick a unit from the digit count: up to 11 digits is seconds (until year 5138), then ms, µs, ns. */
const guessUnit = (integerDigits: number): Exclude<TimestampUnit, "auto"> =>
  integerDigits <= 11 ? "s" : integerDigits <= 14 ? "ms" : integerDigits <= 17 ? "us" : "ns";

const ISO = /^([+-]?\d{4,6})-(\d{2})-(\d{2})(?:[T ](\d{2}):(\d{2})(?::(\d{2})(?:[.,](\d{1,9}))?)?)?\s*(Z|[+-]\d{2}(?::?\d{2})?)?$/i;

const fail = (message: string): never => {
  throw new ToolInputError({ message });
};

const checkRange = (ms: number) => {
  if (!Number.isFinite(ms) || Math.abs(ms) > MAX_MS) fail("That time is outside the range a browser can represent (about ±275,000 years from 1970).");
  return ms;
};

/**
 * Read a Unix timestamp (s, ms, µs or ns), an ISO 8601 date, "now", or any date string
 * the browser understands. Dates without an offset are read in `timeZone`.
 */
export const parseTimestamp = (input: string, unit: TimestampUnit, timeZone: string, now = Date.now()): ParsedTimestamp => {
  const text = input.trim().replace(/_/g, "");
  if (/^now$/i.test(text)) return { ms: now, kind: "now" };

  if (/^[+-]?\d+(\.\d+)?$/.test(text)) {
    const integerDigits = text.replace(/^[+-]/, "").split(".")[0].replace(/^0+(?=\d)/, "").length;
    const chosen = unit === "auto" ? guessUnit(integerDigits) : unit;
    const ms = checkRange(Number(text) / UNIT_DIVISOR[chosen]);
    return { ms, kind: UNIT_KIND[chosen], note: unit === "auto" ? `${integerDigits}-digit number, read as ${UNIT_KIND[chosen]}` : undefined };
  }

  const iso = ISO.exec(text);
  if (iso) {
    const [, y, mo, d, h = "0", mi = "0", s = "0", fraction = "", zone] = iso;
    const [year, month, day, hour, minute, second] = [y, mo, d, h, mi, s].map(Number);
    if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59 || second > 59) fail("That date has a field out of range. Check the month, day and time.");
    const millisecond = Number(fraction.padEnd(3, "0").slice(0, 3));
    let ms: number;
    let note: string | undefined;
    if (zone) {
      const offset = /^z$/i.test(zone)
        ? 0
        : (zone[0] === "-" ? -1 : 1) * (Number(zone.slice(1, 3)) * 60 + Number(zone.replace(":", "").slice(3, 5) || 0));
      ms = utcFromFields(year, month, day, hour, minute, second, millisecond) - offset * 60_000;
    } else {
      ms = zonedToUtc(year, month, day, hour, minute, second, millisecond, timeZone);
      note = `No offset given, read as ${timeZoneLabel(timeZone)} time`;
    }
    // Reject dates such as 31 February, which Date would roll into March.
    const check = zone ? new Date(utcFromFields(year, month, day)) : null;
    if (check && (check.getUTCMonth() + 1 !== month || check.getUTCDate() !== day)) fail(`${y}-${mo} has no day ${day}.`);
    if (!zone) {
      const back = zonedFields(ms, timeZone);
      if (back.month !== month || back.day !== day) fail(`${y}-${mo} has no day ${day}.`);
    }
    return { ms: checkRange(ms), kind: "date", note };
  }

  const parsed = Date.parse(text);
  if (Number.isNaN(parsed)) {
    return fail("Could not read that. Try a Unix timestamp such as 1767225600, or an ISO date such as 2026-11-12T09:30:00Z.");
  }
  return { ms: checkRange(parsed), kind: "date" };
};

/* ---------- Output formats ---------- */

export interface TimeFormat {
  id: string;
  label: string;
  value: string;
}

/** ISO 8601 week number and week-numbering year. */
const isoWeek = (year: number, month: number, day: number) => {
  // The ISO week belongs to the year containing its Thursday.
  const date = new Date(utcFromFields(year, month, day));
  date.setUTCDate(date.getUTCDate() + 4 - (date.getUTCDay() || 7));
  const weekYear = date.getUTCFullYear();
  const week = Math.ceil(((date.getTime() - utcFromFields(weekYear, 1, 1)) / 86_400_000 + 1) / 7);
  return { week, weekYear };
};

const dayOfYear = (year: number, month: number, day: number) => Math.round((utcFromFields(year, month, day) - utcFromFields(year, 1, 1)) / 86_400_000) + 1;

const pad = (value: number, length = 2) => String(Math.abs(value)).padStart(length, "0");
const isoYear = (year: number) => (year >= 0 && year <= 9999 ? pad(year, 4) : `${year < 0 ? "-" : "+"}${pad(year, 6)}`);

const trimDecimal = (value: number) => (Number.isInteger(value) ? String(value) : value.toFixed(3).replace(/0+$/, ""));

/** Every representation shown in the results list. */
export const timeFormats = (ms: number, timeZone: string, now = Date.now()): TimeFormat[] => {
  const f = zonedFields(ms, timeZone);
  const offset = zoneOffsetMinutes(ms, timeZone);
  const millis = ((ms % 1000) + 1000) % 1000;
  const fraction = millis ? `.${pad(millis, 3)}` : "";
  const zonedIso = `${isoYear(f.year)}-${pad(f.month)}-${pad(f.day)}T${pad(f.hour)}:${pad(f.minute)}:${pad(f.second)}${fraction}${offset === 0 ? "Z" : formatOffset(offset)}`;
  const readable = new Intl.DateTimeFormat(undefined, { timeZone, dateStyle: "full", timeStyle: "long" }).format(new Date(ms));
  const { week, weekYear } = isoWeek(f.year, f.month, f.day);

  return [
    { id: "unix-s", label: "Unix seconds", value: trimDecimal(ms / 1000) },
    { id: "unix-ms", label: "Unix milliseconds", value: String(Math.round(ms)) },
    { id: "iso-utc", label: "ISO 8601 (UTC)", value: new Date(ms).toISOString() },
    { id: "iso-zone", label: `ISO 8601 (${timeZoneLabel(timeZone)})`, value: zonedIso },
    { id: "readable", label: `Readable (${timeZoneLabel(timeZone)})`, value: readable },
    { id: "rfc", label: "RFC 7231 / HTTP date", value: new Date(ms).toUTCString() },
    { id: "relative", label: "Relative", value: relativeTime(ms / 1000, now / 1000) },
    { id: "calendar", label: "Calendar", value: `${f.weekday}, day ${dayOfYear(f.year, f.month, f.day)} of ${f.year}, ISO week ${weekYear}-W${pad(week)}` },
    { id: "offset", label: "UTC offset", value: offset === 0 ? "UTC+00:00" : `UTC${formatOffset(offset)}` },
  ];
};

/** A wall-clock value for <input type="datetime-local"> in the given zone. */
export const toDateTimeLocal = (ms: number, timeZone: string) => {
  const f = zonedFields(ms, timeZone);
  if (f.year < 1 || f.year > 9999) return "";
  return `${pad(f.year, 4)}-${pad(f.month)}-${pad(f.day)}T${pad(f.hour)}:${pad(f.minute)}:${pad(f.second)}`;
};
