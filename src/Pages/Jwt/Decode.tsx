import React from "react";
import { KeyRound, PenLine } from "lucide-react";
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
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useJwtVerification } from "@/hooks/use-jwt-verification";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { useHandoff } from "@/lib/handoff";
import { decodeJwt, isSupportedAlg, isSymmetric, numericClaim, relativeTime, timeState, type SecretEncoding } from "@/lib/jwt";
import { prettyJson } from "@/lib/utils";
import { Claims } from "./Claims";
import type { EncodeSeed } from "./Encode";
import { VerificationLine } from "./VerificationLine";
import { ENCODING_OPTIONS, KEY_TEXTAREA_CLASS, SAMPLE_SECRET, SAMPLE_TOKEN } from "./shared";

type View = "payload" | "header" | "claims";

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "payload", label: "Payload" },
  { value: "header", label: "Header" },
  { value: "claims", label: "Claims" },
];



export interface DecodeSeed {
  token: string;
  key: string;
  encoding: SecretEncoding;
}

interface DecodeProps {
  /** The Decode / Encode switch, rendered at the start of the toolbar. */
  modeControl: React.ReactNode;
  /** Values carried over from Encode mode. */
  seed?: DecodeSeed;
  /** Send the current payload to Encode mode. */
  onEditPayload: (seed: EncodeSeed) => void;
  /** Report the current inputs so they can be restored after a mode switch. */
  onSnapshot: (snapshot: DecodeSeed) => void;
}

export const JwtDecode = ({ modeControl, seed, onEditPayload, onSnapshot }: DecodeProps) => {
  const handoff = useHandoff();
  // The key is deliberately plain state: secrets are never saved or shared.
  const [input, setInput] = usePersistentState("jwt:decode", "token", handoff?.input ?? "", { override: seed?.token });
  const [key, setKey] = React.useState(seed?.key ?? "");
  const [encoding, setEncoding] = usePersistentState<SecretEncoding>("jwt:decode", "encoding", "utf8", { override: seed?.encoding });

  React.useEffect(() => {
    onSnapshot({ token: input, key, encoding });
  }, [input, key, encoding, onSnapshot]);
  const [view, setView] = usePersistentState<View>("jwt:decode", "view", "payload");

  const runner = useToolRunner(input, decodeJwt, []);
  const decoded = runner.outcome.kind === "ok" ? runner.outcome.value : null;
  const shown = outputOf(runner);
  const verification = useJwtVerification(decoded, key, encoding);

  const symmetric = decoded ? isSymmetric(decoded.alg) : true;
  const canVerify = decoded ? decoded.alg !== "none" && isSupportedAlg(decoded.alg) : true;
  const time = decoded ? timeState(decoded.payload) : "none";
  const exp = decoded ? numericClaim(decoded.payload, "exp") : null;
  const nbf = decoded ? numericClaim(decoded.payload, "nbf") : null;

  const payloadJson = shown ? prettyJson(shown.payload) : "";
  const headerJson = shown ? prettyJson(shown.header) : "";
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
      shareScope="jwt:decode"
      shareHasSecrets
      next={[
        { to: "json-formatter", label: "Open payload in JSON Formatter", handoff: payloadJson ? { input: payloadJson } : undefined },
        { to: "json-to-code", label: "Generate interface from payload", handoff: payloadJson ? { input: payloadJson } : undefined },
      ]}
    >
      <Toolbar>
        {modeControl}
        <p className="hidden pl-1 text-[13px] text-ink-3 lg:block">Tokens and keys stay in this browser tab.</p>
        <ToolbarSpacer />
        <ToolbarGroup>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={!shown}
            onClick={() => shown && onEditPayload({ payload: payloadJson, header: shown.header, ...(isSymmetric(shown.alg) ? { key, encoding } : {}) })}
          >
            <PenLine /> Edit and re-sign
          </Button>
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
                className={KEY_TEXTAREA_CLASS}
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
