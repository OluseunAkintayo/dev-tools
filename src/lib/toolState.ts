/**
 * Tool inputs that survive a reload (sessionStorage) and can be shared as a link (compressed into the URL fragment, never sent to the server).
 * Each tool or mode is a "scope" of named fields. Secrets such as JWT and HMAC keys are never registered, so never saved or shared.
 */

export type Fields = Record<string, unknown>;

interface Saved {
  key?: string;
  fields: Fields;
}

const STORAGE_PREFIX = "nextools:tool:";
const SHARE_PARAM = "share";
const SHARE_VERSION = 1;

/** Longer share links are refused: chat apps and some browsers cut them off. */
export const MAX_SHARE_URL_LENGTH = 16_000;

/** Latest values per scope, so Share sees the newest keystroke. */
const memory = new Map<string, Fields>();

let pendingShare: { scope: string; fields: Fields } | null = null;

const storageKey = (scope: string) => `${STORAGE_PREFIX}${scope}`;

export const readSaved = (scope: string): Saved | null => {
  try {
    const raw = sessionStorage.getItem(storageKey(scope));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Saved;
    return parsed && typeof parsed === "object" && parsed.fields && typeof parsed.fields === "object" ? parsed : null;
  } catch {
    return null;
  }
};

/** Quota errors (a huge input) are ignored: the tool still works but won't survive a reload. */
export const saveField = (scope: string, field: string, value: unknown, key: string | undefined) => {
  const fields = { ...(memory.get(scope) ?? readSaved(scope)?.fields ?? {}), [field]: value };
  memory.set(scope, fields);
  try {
    sessionStorage.setItem(storageKey(scope), JSON.stringify({ key, fields } satisfies Saved));
  } catch {
    // Storage full or disabled.
  }
};

export const sharedField = (scope: string, field: string): { value: unknown } | null =>
  pendingShare?.scope === scope && Object.prototype.hasOwnProperty.call(pendingShare.fields, field) ? { value: pendingShare.fields[field] } : null;

export const consumeShare = (scope: string) => {
  if (pendingShare?.scope === scope) pendingShare = null;
};

const toBase64Url = (bytes: Uint8Array) => {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
};

const fromBase64Url = (text: string) => {
  const base64 = text.replace(/-/g, "+").replace(/_/g, "/");
  return Uint8Array.from(atob(base64 + "=".repeat((4 - (base64.length % 4)) % 4)), (char) => char.charCodeAt(0));
};

const pipe = async (bytes: Uint8Array, stream: CompressionStream | DecompressionStream) => {
  const writer = stream.writable.getWriter();
  // Not awaited: the readable side must be consumed concurrently or a large input stalls. A corrupt payload surfaces there.
  writer
    .write(bytes)
    .then(() => writer.close())
    .catch(() => {});
  return new Uint8Array(await new Response(stream.readable).arrayBuffer());
};

export const encodeShare = async (scope: string, fields: Fields) =>
  toBase64Url(await pipe(new TextEncoder().encode(JSON.stringify({ v: SHARE_VERSION, s: scope, f: fields })), new CompressionStream("deflate-raw")));

export const decodeShare = async (payload: string): Promise<{ scope: string; fields: Fields }> => {
  const json = new TextDecoder().decode(await pipe(fromBase64Url(payload), new DecompressionStream("deflate-raw")));
  const parsed = JSON.parse(json) as { v?: number; s?: unknown; f?: unknown };
  if (parsed.v !== SHARE_VERSION || typeof parsed.s !== "string" || !parsed.f || typeof parsed.f !== "object" || Array.isArray(parsed.f)) throw new Error("Unsupported share link.");
  return { scope: parsed.s, fields: parsed.f as Fields };
};

export type ShareResult = { ok: true; url: string } | { ok: false; reason: "too-large"; length: number };

export const buildShareUrl = async (scope: string): Promise<ShareResult> => {
  const fields = memory.get(scope) ?? readSaved(scope)?.fields ?? {};
  const url = `${location.origin}${location.pathname}${location.search}#${SHARE_PARAM}=${await encodeShare(scope, fields)}`;
  return url.length > MAX_SHARE_URL_LENGTH ? { ok: false, reason: "too-large", length: url.length } : { ok: true, url };
};

export type ShareLoad = "none" | "loaded" | "invalid";

/** Before first render: stage a "#share=…" fragment's values for the tool and remove it from the address bar so it isn't carried again. */
export const loadSharedState = async (): Promise<ShareLoad> => {
  const match = new RegExp(`^#${SHARE_PARAM}=([\\w-]+)$`).exec(location.hash);
  if (!match) return "none";
  history.replaceState(history.state, "", `${location.pathname}${location.search}`);
  try {
    const shared = await decodeShare(match[1]);
    pendingShare = shared;
    // A shared link starts a fresh session for that tool.
    memory.delete(shared.scope);
    try {
      sessionStorage.removeItem(storageKey(shared.scope));
    } catch {
      // Storage disabled.
    }
    return "loaded";
  } catch {
    return "invalid";
  }
};

/** Analytics must never see a fragment, since share links keep tool input there. */
export const stripFragment = (url: string) => url.split("#")[0];
