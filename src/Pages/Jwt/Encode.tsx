import React from "react";
import { KeyRound, ShieldCheck, Sparkles } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { Segmented } from "@/components/workspace/controls";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton } from "@/components/workspace/actions";
import { ClearButton } from "@/components/workspace/run";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarLabel, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useCopy } from "@/hooks/use-copy";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useJwtSigning } from "@/hooks/use-jwt-signing";
import { useToolRunner } from "@/hooks/use-tool-runner";
import {
  generateKey,
  headerTextWithoutAlg,
  isSymmetric,
  nowSeconds,
  numericClaim,
  parseHeaderText,
  publicKeyFor,
  relativeTime,
  SIGNING_ALGORITHMS,
  weakSecretWarning,
  type SecretEncoding,
  type SigningAlg,
} from "@/lib/jwt";
import { byteLength, formatBytes } from "@/lib/text";
import { parseJson } from "@/lib/toolError";
import { isPlainObject, prettyJson } from "@/lib/utils";
import type { DecodeSeed } from "./Decode";
import { KeyNotice } from "./KeyNotice";
import { ENCODING_OPTIONS, KEY_TEXTAREA_CLASS, SAMPLE_SECRET } from "./shared";

export interface EncodeSeed {
  payload: string;
  /** Header from a decoded token; its alg picks the algorithm when supported. */
  header?: Record<string, unknown>;
  /** Exact header text, when restoring after a mode switch. */
  headerText?: string;
  alg?: SigningAlg;
  key?: string;
  encoding?: SecretEncoding;
}

type Editing = "payload" | "header";

const EDIT_OPTIONS: { value: Editing; label: string }[] = [
  { value: "payload", label: "Payload" },
  { value: "header", label: "Header" },
];

const EXPIRY_OPTIONS = [
  { label: "15 minutes", seconds: 900 },
  { label: "1 hour", seconds: 3600 },
  { label: "1 day", seconds: 86_400 },
  { label: "7 days", seconds: 604_800 },
  { label: "30 days", seconds: 2_592_000 },
];

const SAMPLE_PAYLOAD = { sub: "1234567890", name: "John Doe", iat: 1516239022 };

const selectClass =
  "h-8 rounded-lg border border-line-strong bg-surface px-2 font-mono text-[13px] text-ink outline-none focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/20 disabled:opacity-45";

interface EncodeProps {
  modeControl: React.ReactNode;
  seed?: EncodeSeed;
  /** Open the signed token in Decode mode with a key that verifies it. */
  onVerify: (seed: DecodeSeed) => void;
  /** Report the current inputs so they can be restored after a mode switch. */
  onSnapshot: (snapshot: EncodeSeed) => void;
}

export const JwtEncode = ({ modeControl, seed, onVerify, onSnapshot }: EncodeProps) => {
  const seededAlg = seed?.alg ?? SIGNING_ALGORITHMS.find((alg) => alg === seed?.header?.alg);
  const [alg, setAlg] = usePersistentState<SigningAlg>("jwt:encode", "alg", "HS256", { override: seededAlg });
  const [payload, setPayload] = usePersistentState("jwt:encode", "payload", () => prettyJson({ sub: "1234567890", name: "John Doe", iat: nowSeconds() }), { override: seed?.payload });
  const [header, setHeader] = usePersistentState("jwt:encode", "header", () => headerTextWithoutAlg({}), {
    override: seed?.headerText ?? (seed?.header ? headerTextWithoutAlg(seed.header) : undefined),
  });
  const [editing, setEditing] = usePersistentState<Editing>("jwt:encode", "editing", "payload");
  // The signing key is deliberately plain state: secrets are never saved or shared.
  const [key, setKey] = React.useState(seed?.key ?? "");
  const [encoding, setEncoding] = usePersistentState<SecretEncoding>("jwt:encode", "encoding", "utf8", { override: seed?.encoding });

  React.useEffect(() => {
    onSnapshot({ payload, headerText: header, alg, key, encoding });
  }, [payload, header, alg, key, encoding, onSnapshot]);
  const [generatedPublic, setGeneratedPublic] = React.useState<{ privateKey: string; publicKey: string } | null>(null);
  const copy = useCopy();

  const symmetric = isSymmetric(alg);

  const payloadRunner = useToolRunner(payload, parseJson, []);
  const headerResult = React.useMemo(() => parseHeaderText(header), [header]);

  const payloadValue = payloadRunner.outcome.kind === "ok" ? payloadRunner.outcome.value : undefined;
  const headerValue = headerResult.ok ? headerResult.value : undefined;
  const signing = useJwtSigning(alg, headerValue, payloadValue, key, encoding);

  const token = signing.kind === "done" && signing.ok ? signing.token : "";
  const signError = signing.kind === "done" && !signing.ok ? signing.message : null;
  const weak = weakSecretWarning(alg, key, encoding);
  const inputError = editing === "payload" ? payloadRunner.visibleError : headerResult.ok ? null : { message: headerResult.message };

  const exp = numericClaim(payloadValue, "exp");

  /** Edit the payload object, keeping it formatted. No-op while the JSON is invalid. */
  const updatePayload = (change: (value: Record<string, unknown>) => Record<string, unknown>) => {
    if (!isPlainObject(payloadValue)) return;
    setPayload(prettyJson(change(payloadValue)));
    setEditing("payload");
  };

  const setExpiry = (seconds: number) =>
    updatePayload((value) => {
      const now = nowSeconds();
      return { ...value, iat: value.iat ?? now, exp: now + seconds };
    });

  const generate = async () => {
    const pair = await generateKey(alg);
    setKey(pair.privateKey);
    setEncoding(symmetric ? "base64" : "utf8");
    setGeneratedPublic(symmetric ? null : pair);
  };

  const publicKey = async () =>
    generatedPublic && generatedPublic.privateKey === key ? generatedPublic.publicKey : publicKeyFor(alg, key, encoding);

  const copyPublicKey = async () => {
    const value = await publicKey();
    if (value) await copy(value);
  };

  const verify = async () => {
    const value = await publicKey();
    if (token && value) onVerify({ token, key: value, encoding: symmetric ? encoding : "utf8" });
  };

  const loadSample = () => {
    setAlg("HS256");
    setPayload(prettyJson(SAMPLE_PAYLOAD));
    setHeader(prettyJson({ typ: "JWT" }));
    setKey(SAMPLE_SECRET);
    setEncoding("utf8");
    setEditing("payload");
  };

  const clear = () => {
    setPayload("");
    setKey("");
    setGeneratedPublic(null);
  };

  const status =
    signing.kind === "done"
      ? signing.ok
        ? { kind: "ok" as const, label: `Signed with ${alg}` }
        : { kind: "error" as const, label: "Could not sign" }
      : signing.kind === "signing"
        ? { kind: "working" as const, label: "Signing" }
        : payloadRunner.visibleError || !headerResult.ok
          ? { kind: "error" as const, label: "Invalid JSON" }
          : { kind: "idle" as const, label: key ? "Waiting for valid JSON" : `Add a ${symmetric ? "secret" : "private key"} to sign` };

  return (
    <ToolLayout toolId="jwt" shareScope="jwt:encode" shareHasSecrets>
      <Toolbar>
        {modeControl}
        <ToolbarGroup>
          <ToolbarLabel htmlFor="jwt-alg">Algorithm</ToolbarLabel>
          <select id="jwt-alg" value={alg} onChange={(event) => setAlg(event.target.value as SigningAlg)} className={selectClass}>
            {SIGNING_ALGORITHMS.map((option) => (
              <option key={option} value={option}>
                {option}
              </option>
            ))}
          </select>
        </ToolbarGroup>
        <ToolbarGroup>
          <label className="sr-only" htmlFor="jwt-exp">
            Set expiry
          </label>
          <select
            id="jwt-exp"
            value=""
            disabled={!isPlainObject(payloadValue)}
            onChange={(event) => event.target.value && setExpiry(Number(event.target.value))}
            className={selectClass}
          >
            <option value="">Set expiry…</option>
            {EXPIRY_OPTIONS.map((option) => (
              <option key={option.seconds} value={option.seconds}>
                Expires in {option.label}
              </option>
            ))}
          </select>
          <Button type="button" variant="ghost" size="sm" disabled={!isPlainObject(payloadValue)} onClick={() => updatePayload((value) => ({ ...value, iat: nowSeconds() }))}>
            Set iat to now
          </Button>
        </ToolbarGroup>
        <ToolbarSpacer />
        <ToolbarGroup>
          <Button type="button" variant="ghost" size="sm" onClick={loadSample}>
            Try a sample
          </Button>
          <ClearButton onClick={clear} disabled={!payload && !key} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane title={editing === "payload" ? "Payload" : "Header"} actions={<Segmented label="Edit" value={editing} options={EDIT_OPTIONS} onChange={setEditing} />}>
          <div className="flex h-full flex-col">
            <div className="relative min-h-0 flex-1">
              {editing === "payload" ? (
                <CodeEditor key="payload" label="JWT payload" value={payload} onChange={setPayload} placeholder="Paste the claims as a JSON object" errorLine={payloadRunner.visibleError?.line} autoFocus />
              ) : (
                <CodeEditor key="header" label="JWT header" value={header} onChange={setHeader} placeholder='{ "typ": "JWT", "kid": "my-key" }' />
              )}
              {inputError && <ErrorNotice error={inputError} />}
            </div>
            {editing === "header" && (
              <p className="shrink-0 border-t border-line px-4 py-2 text-[12px] text-ink-3">
                alg is set from the Algorithm picker. Add <span className="font-mono">kid</span> here if your verifier looks keys up by ID.
              </p>
            )}

            <div className="shrink-0 border-t border-line">
              <div className="flex h-10 items-center gap-2 pl-4 pr-2">
                <label htmlFor="jwt-sign-key" className="text-[13px] font-medium text-ink">
                  {symmetric ? "Secret" : "Private key"}
                </label>
                <span className="truncate text-[12px] text-ink-3">{symmetric ? `for ${alg}` : `PEM (PKCS#8) or JWK for ${alg}`}</span>
                <div className="ml-auto flex items-center gap-1.5">
                  {symmetric && <Segmented label="Secret encoding" value={encoding} options={ENCODING_OPTIONS} onChange={setEncoding} />}
                  <Button type="button" variant="ghost" size="sm" onClick={generate}>
                    <Sparkles /> Generate
                  </Button>
                </div>
              </div>
              <textarea
                id="jwt-sign-key"
                value={key}
                onChange={(event) => setKey(event.target.value)}
                placeholder={symmetric ? "Type a shared secret, or generate one" : "-----BEGIN PRIVATE KEY----- or a private JWK"}
                spellCheck={false}
                autoComplete="off"
                rows={symmetric ? 2 : 4}
                className={KEY_TEXTAREA_CLASS}
              />
              <KeyNotice message={signError ?? weak} kind={signError ? "error" : weak ? "warn" : null} />
            </div>
          </div>
        </Pane>

        <Pane
          title="Token"
          actions={
            <>
              {!symmetric && (
                <Button type="button" variant="outline" size="sm" onClick={copyPublicKey} disabled={!key || Boolean(signError)}>
                  Copy public key
                </Button>
              )}
              <Button type="button" variant="outline" size="sm" onClick={verify} disabled={!token}>
                <ShieldCheck /> Verify
              </Button>
              <CopyButton text={token} shortcut />
            </>
          }
        >
          {token ? (
            <CodeView code={token} language="text" label="Signed JWT" wrap dimmed={signing.kind !== "done"} />
          ) : (
            <EmptyState
              icon={KeyRound}
              title={symmetric ? "Add a secret to sign" : "Add a private key to sign"}
              action={
                <Button type="button" variant="outline" size="sm" onClick={generate}>
                  <Sparkles /> Generate a {symmetric ? "secret" : "key pair"}
                </Button>
              }
            >
              The signed token shows up here as you type. Keys never leave this tab.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar
        kind={status.kind}
        label={status.label}
        items={token ? [formatBytes(byteLength(token)), exp !== null ? (exp > nowSeconds() ? `Expires ${relativeTime(exp)}` : `Expired ${relativeTime(exp)}`) : "No expiry"] : []}
      />
    </ToolLayout>
  );
};
