import React from "react";
import { KeyRound, ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { Segmented } from "@/components/workspace/controls";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton } from "@/components/workspace/run";
import { outputOf, statusFor } from "@/components/workspace/status";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { useHandoff } from "@/lib/handoff";
import { decodeJwt, isSupportedAlg, isSymmetric, relativeTime, timeState, verifyJwt, type DecodedJwt, type SecretEncoding, type VerifyResult } from "@/lib/jwt";
import { cn } from "@/lib/utils";

type View = "payload" | "header" | "claims";

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "payload", label: "Payload" },
  { value: "header", label: "Header" },
  { value: "claims", label: "Claims" },
];

const ENCODING_OPTIONS: { value: SecretEncoding; label: string }[] = [
  { value: "utf8", label: "Text" },
  { value: "base64", label: "Base64" },
];

/** The well-known jwt.io example, signed with HS256 and the secret "your-256-bit-secret". */
const SAMPLE_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkpvaG4gRG9lIiwiaWF0IjoxNTE2MjM5MDIyfQ.SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";
const SAMPLE_SECRET = "your-256-bit-secret";

const CLAIM_LABELS: Record<string, string> = {
  iss: "Issuer",
  sub: "Subject",
  aud: "Audience",
  exp: "Expires",
  nbf: "Not before",
  iat: "Issued at",
  jti: "Token ID",
  scope: "Scope",
  azp: "Authorized party",
};
const TIME_CLAIMS = new Set(["exp", "nbf", "iat", "auth_time"]);

const formatDate = (seconds: number) =>
  new Date(seconds * 1000).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "long" });

const Claims = ({ payload }: { payload: unknown }) => {
  if (typeof payload !== "object" || payload === null || Array.isArray(payload)) {
    return <p className="p-4 text-sm text-ink-3">The payload is not a JSON object, so it has no claims.</p>;
  }
  const entries = Object.entries(payload as Record<string, unknown>);
  const known = entries.filter(([key]) => key in CLAIM_LABELS || TIME_CLAIMS.has(key));
  const custom = entries.filter(([key]) => !(key in CLAIM_LABELS || TIME_CLAIMS.has(key)));

  const row = ([key, value]: [string, unknown]) => {
    const isTime = TIME_CLAIMS.has(key) && typeof value === "number";
    return (
      <div key={key} className="grid grid-cols-[minmax(7rem,auto)_1fr] gap-x-4 border-b border-line px-4 py-2.5 last:border-b-0">
        <dt className="text-[13px] text-ink-3">
          {CLAIM_LABELS[key] ?? (key === "auth_time" ? "Authenticated" : key)}
          {CLAIM_LABELS[key] && <span className="ml-1.5 font-mono text-[11px] text-ink-4">{key}</span>}
        </dt>
        <dd className="min-w-0 break-words font-mono text-[13px] text-ink">
          {isTime ? (
            <>
              {formatDate(value as number)}
              <span className="ml-2 font-sans text-ink-3">{relativeTime(value as number)}</span>
            </>
          ) : typeof value === "string" ? (
            value
          ) : (
            JSON.stringify(value)
          )}
        </dd>
      </div>
    );
  };

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

type Verification = { kind: "idle" } | { kind: "checking" } | ({ kind: "done" } & VerifyResult);

const useVerification = (token: DecodedJwt | null, key: string, encoding: SecretEncoding): Verification => {
  const [state, setState] = React.useState<Verification>({ kind: "idle" });
  const deferredKey = React.useDeferredValue(key);

  React.useEffect(() => {
    if (!token || !deferredKey.trim()) {
      setState({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setState({ kind: "checking" });
    verifyJwt(token, deferredKey, encoding).then((result) => {
      if (!cancelled) setState({ kind: "done", ...result });
    });
    return () => {
      cancelled = true;
    };
  }, [token, deferredKey, encoding]);

  return state;
};

const JwtDecoder = () => {
  const handoff = useHandoff();
  const [input, setInput] = React.useState(handoff?.input ?? "");
  const [key, setKey] = React.useState("");
  const [encoding, setEncoding] = React.useState<SecretEncoding>("utf8");
  const [view, setView] = React.useState<View>("payload");

  const runner = useToolRunner(input, decodeJwt, []);
  const decoded = runner.outcome.kind === "ok" ? runner.outcome.value : null;
  const shown = outputOf(runner);
  const verification = useVerification(decoded, key, encoding);

  const symmetric = decoded ? isSymmetric(decoded.alg) : true;
  const canVerify = decoded ? decoded.alg !== "none" && isSupportedAlg(decoded.alg) : true;
  const time = decoded ? timeState(decoded.payload) : "none";
  const exp = decoded && typeof (decoded.payload as Record<string, unknown> | null)?.exp === "number" ? ((decoded.payload as Record<string, number>).exp) : null;
  const nbf = decoded && typeof (decoded.payload as Record<string, unknown> | null)?.nbf === "number" ? ((decoded.payload as Record<string, number>).nbf) : null;

  const payloadJson = shown ? JSON.stringify(shown.payload, null, 2) : "";
  const headerJson = shown ? JSON.stringify(shown.header, null, 2) : "";
  const viewText = view === "header" ? headerJson : payloadJson;

  const base = statusFor(runner, { ok: "Decoded", error: "Invalid token", runLabel: "Decode" });
  const status =
    decoded && verification.kind === "done"
      ? verification.valid
        ? { kind: "ok" as const, label: "Signature verified" }
        : { kind: "error" as const, label: "Signature not verified" }
      : base;

  const timeLabel =
    time === "expired" && exp !== null
      ? `Expired ${relativeTime(exp)}`
      : time === "not-yet-valid" && nbf !== null
        ? `Valid ${relativeTime(nbf)}`
        : time === "valid" && exp !== null
          ? `Expires ${relativeTime(exp)}`
          : decoded
            ? "No expiry"
            : null;

  const error = runner.visibleError;

  const loadSample = () => {
    setInput(SAMPLE_TOKEN);
    setKey(SAMPLE_SECRET);
    setEncoding("utf8");
  };

  const clear = () => {
    setInput("");
    setKey("");
  };

  return (
    <ToolLayout
      toolId="jwt"
      next={[
        { to: "json-formatter", label: "Open payload in JSON Formatter", handoff: payloadJson ? { input: payloadJson } : undefined },
        { to: "json-to-interface", label: "Generate interface from payload", handoff: payloadJson ? { input: payloadJson } : undefined },
      ]}
    >
      <Toolbar>
        <p className="pl-1 text-[13px] text-ink-3">Tokens and keys stay in this browser tab.</p>
        <ToolbarSpacer />
        <ToolbarGroup>
          <Button type="button" variant="ghost" size="sm" onClick={loadSample}>
            Try a sample
          </Button>
          <ClearButton onClick={clear} disabled={!input && !key} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane title="Token" actions={<PasteButton onPaste={setInput} />}>
          <div className="flex h-full flex-col">
            <div className="relative min-h-0 flex-1">
              <CodeEditor
                label="JWT"
                value={input}
                onChange={setInput}
                placeholder="Paste a JWT. A Bearer prefix is fine."
                wrap
                autoFocus={!handoff}
              />
              {error && <ErrorNotice error={error} />}
            </div>

            <div className="shrink-0 border-t border-line">
              <div className="flex h-10 items-center gap-2 pl-4 pr-2">
                <label htmlFor="jwt-key" className="text-[13px] font-medium text-ink">
                  {symmetric ? "Secret" : "Public key"}
                </label>
                <span className="truncate text-[12px] text-ink-3">{symmetric ? `for ${decoded?.alg ?? "HS256"}` : `PEM or JWK for ${decoded?.alg}`}</span>
                {symmetric && (
                  <Segmented label="Secret encoding" value={encoding} options={ENCODING_OPTIONS} onChange={setEncoding} className="ml-auto" />
                )}
              </div>
              <textarea
                id="jwt-key"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                disabled={!canVerify}
                placeholder={
                  !canVerify
                    ? "This token's algorithm cannot be verified."
                    : symmetric
                      ? "Paste the shared secret to verify the signature"
                      : "-----BEGIN PUBLIC KEY-----, a JWK, or a JWKS"
                }
                spellCheck={false}
                autoComplete="off"
                rows={symmetric ? 2 : 4}
                className="block w-full resize-none border-t border-line bg-transparent px-4 py-2.5 font-mono text-[13px] leading-6 text-ink-2 caret-brand outline-none placeholder:font-sans placeholder:text-[13px] placeholder:text-ink-3 focus-visible:bg-sunken/40 disabled:opacity-60"
              />
              <VerificationLine
                verification={verification}
                hasToken={Boolean(decoded)}
                unverifiable={
                  decoded && !canVerify
                    ? decoded.alg === "none"
                      ? 'This token uses alg "none" and has no signature. Treat it as untrusted.'
                      : `Verifying ${decoded.alg || "a token without an alg"} is not supported.`
                    : null
                }
              />
            </div>
          </div>
        </Pane>

        <Pane
          title="Decoded"
          meta={shown?.alg ? shown.alg : null}
          actions={
            <>
              <Segmented label="Decoded view" value={view} options={VIEW_OPTIONS} onChange={setView} />
              <CopyButton text={view === "claims" ? payloadJson : viewText} shortcut />
            </>
          }
        >
          {!shown ? (
            <EmptyState
              icon={KeyRound}
              title="Paste a JWT into Token"
              action={
                <Button type="button" variant="outline" size="sm" onClick={loadSample}>
                  Try a sample
                </Button>
              }
            >
              The header, payload and claims show up here.
            </EmptyState>
          ) : view === "claims" ? (
            <Claims payload={shown.payload} />
          ) : (
            <CodeView code={viewText} language="json" label={view === "header" ? "JWT header" : "JWT payload"} dimmed={runner.outcome.kind === "error"} />
          )}
        </Pane>
      </Panes>

      <StatusBar kind={status.kind} label={status.label} items={decoded ? [decoded.alg || "No alg", typeof decoded.header.typ === "string" && decoded.header.typ, timeLabel] : []} />
    </ToolLayout>
  );
};

const VerificationLine = ({ verification, hasToken, unverifiable }: { verification: Verification; hasToken: boolean; unverifiable: string | null }) => {
  if (unverifiable) {
    return (
      <p role="status" aria-live="polite" className="flex items-start gap-2 border-t border-line px-4 py-2.5 text-[13px] leading-5 text-warn">
        <ShieldAlert className="mt-0.5 h-4 w-4 shrink-0" />
        {unverifiable}
      </p>
    );
  }
  const done = verification.kind === "done";
  const Icon = done ? (verification.valid ? ShieldCheck : ShieldAlert) : ShieldQuestion;
  const message = !hasToken
    ? "Paste a token to verify its signature."
    : verification.kind === "idle"
      ? "Signature not checked. Add a key to verify it."
      : verification.kind === "checking"
        ? "Checking signature…"
        : verification.message;

  return (
    <p
      role="status"
      aria-live="polite"
      className={cn(
        "flex items-start gap-2 border-t border-line px-4 py-2.5 text-[13px] leading-5",
        done ? (verification.valid ? "text-brand" : "text-destructive") : "text-ink-3"
      )}
    >
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  );
};

export default JwtDecoder;
