import { formatClaimDate, relativeTime } from "@/lib/jwt";
import { isPlainObject } from "@/lib/utils";

const CLAIM_LABELS: Record<string, string> = {
  iss: "Issuer",
  sub: "Subject",
  aud: "Audience",
  exp: "Expires",
  nbf: "Not before",
  iat: "Issued at",
  auth_time: "Authenticated",
  jti: "Token ID",
  scope: "Scope",
  azp: "Authorized party",
};
const TIME_CLAIMS = new Set(["exp", "nbf", "iat", "auth_time"]);

/** Registered claims with readable labels and dates, followed by custom claims. */
export const Claims = ({ payload }: { payload: unknown }) => {
  if (!isPlainObject(payload)) {
    return <p className="p-4 text-sm text-ink-3">The payload is not a JSON object, so it has no claims.</p>;
  }
  const entries = Object.entries(payload);
  const known = entries.filter(([key]) => key in CLAIM_LABELS);
  const custom = entries.filter(([key]) => !(key in CLAIM_LABELS));

  const row = ([key, value]: [string, unknown]) => (
    <div key={key} className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 border-b border-line px-4 py-2.5 last:border-b-0">
      <dt className="text-[13px] text-ink-3">
        {CLAIM_LABELS[key] ?? key}
        {CLAIM_LABELS[key] && <span className="ml-1.5 font-mono text-[11px] text-ink-4">{key}</span>}
      </dt>
      <dd className="min-w-0 break-words font-mono text-[13px] text-ink">
        {TIME_CLAIMS.has(key) && typeof value === "number" ? (
          <>
            {formatClaimDate(value)}
            <span className="ml-2 font-sans text-ink-3">{relativeTime(value)}</span>
          </>
        ) : typeof value === "string" ? (
          value
        ) : (
          JSON.stringify(value)
        )}
      </dd>
    </div>
  );

  return (
    <div className="h-full overflow-auto">
      {known.length > 0 && <dl>{known.map(row)}</dl>}
      {custom.length > 0 && (
        <>
          <h3 className="border-y border-line bg-gutter px-4 py-1.5 text-[12px] font-medium text-ink-3">Custom claims</h3>
          <dl>{custom.map(row)}</dl>
        </>
      )}
      {entries.length === 0 && <p className="p-4 text-sm text-ink-3">The payload is empty.</p>}
    </div>
  );
};
