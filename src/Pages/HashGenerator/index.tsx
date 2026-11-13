import React from "react";
import { FileDigit, Fingerprint, X } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CopyRow } from "@/components/workspace/CopyRow";
import { Segmented, Switch } from "@/components/workspace/controls";
import { EmptyState } from "@/components/workspace/Feedback";
import { CopyButton, OpenFileButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton } from "@/components/workspace/run";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarLabel, ToolbarSpacer } from "@/components/workspace/Workspace";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useHashes } from "@/hooks/use-hashes";
import { useHandoff } from "@/lib/handoff";
import { findMatch, formatDigest, HASH_ALGORITHMS, keyBytes, WEAK_ALGORITHMS, type DigestFormat, type KeyEncoding } from "@/lib/hash";
import { formatBytes } from "@/lib/text";
import { cn } from "@/lib/utils";

const FORMAT_OPTIONS: { value: DigestFormat; label: string }[] = [
  { value: "hex", label: "hex" },
  { value: "HEX", label: "HEX" },
  { value: "base64", label: "Base64" },
];

const KEY_ENCODING_OPTIONS: { value: KeyEncoding; label: string }[] = [
  { value: "text", label: "Text" },
  { value: "hex", label: "Hex" },
];

const fieldClass =
  "h-8 min-w-0 rounded-lg border border-line-strong bg-surface px-2.5 font-mono text-[13px] text-ink outline-none placeholder:font-sans placeholder:text-ink-4 focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/20 aria-[invalid=true]:border-destructive/60";

const HashGenerator = () => {
  const handoff = useHandoff();
  const [input, setInput] = usePersistentState("hash", "input", handoff?.input ?? "");
  const [file, setFile] = React.useState<File | null>(null);
  const [format, setFormat] = usePersistentState<DigestFormat>("hash", "format", "hex");
  const [hmac, setHmac] = usePersistentState("hash", "hmac", false);
  // The HMAC key is deliberately plain state: secrets are never saved or shared.
  const [key, setKey] = React.useState("");
  const [keyEncoding, setKeyEncoding] = usePersistentState<KeyEncoding>("hash", "keyEncoding", "text");
  const [expected, setExpected] = usePersistentState("hash", "expected", "");

  // A stable key object, so hashing only re-runs when the key actually changes.
  const keyResult = React.useMemo(() => {
    if (!hmac) return { bytes: undefined, error: null };
    try {
      return { bytes: keyBytes(key, keyEncoding), error: null };
    } catch (err) {
      return { bytes: undefined, error: err instanceof Error ? err.message : "Invalid key." };
    }
  }, [hmac, key, keyEncoding]);

  const blocked = Boolean(keyResult.error);
  const state = useHashes(blocked ? "" : input, blocked ? null : file, keyResult.bytes);
  const digests = state.kind === "done" ? state.digests : null;
  const match = digests && expected.trim() ? findMatch(digests, expected) : null;
  const prefix = hmac ? "HMAC-" : "";

  const rows = digests ? HASH_ALGORITHMS.map((alg) => ({ alg, label: `${prefix}${alg}`, value: formatDigest(digests[alg], format) })) : [];
  const allText = rows.map((row) => `${row.label}: ${row.value}`).join("\n");

  const status = blocked
    ? { kind: "error" as const, label: "Invalid HMAC key" }
    : state.kind === "working"
      ? { kind: "working" as const, label: state.total ? `Hashing ${Math.floor(((state.loaded ?? 0) / state.total) * 100)}%` : "Hashing" }
      : state.kind === "error"
        ? { kind: "error" as const, label: "Could not hash" }
        : state.kind === "done"
          ? { kind: "ok" as const, label: hmac ? "HMAC computed" : "Hashed" }
          : { kind: "idle" as const, label: "Waiting for text or a file" };

  const clear = () => {
    setInput("");
    setFile(null);
    setExpected("");
  };

  return (
    <ToolLayout toolId="hash" shareHasSecrets>
      <Toolbar>
        <ToolbarGroup>
          <ToolbarLabel>Output</ToolbarLabel>
          <Segmented label="Output format" value={format} options={FORMAT_OPTIONS} onChange={setFormat} />
        </ToolbarGroup>
        <Switch label="HMAC" checked={hmac} onChange={setHmac} />
        {hmac && (
          <ToolbarGroup>
            <label htmlFor="hash-key" className="sr-only">
              HMAC key
            </label>
            <input
              id="hash-key"
              value={key}
              onChange={(event) => setKey(event.target.value)}
              placeholder="Secret key"
              spellCheck={false}
              autoComplete="off"
              aria-invalid={blocked}
              title={keyResult.error ?? undefined}
              className={cn(fieldClass, "w-48")}
            />
            <Segmented label="Key encoding" value={keyEncoding} options={KEY_ENCODING_OPTIONS} onChange={setKeyEncoding} />
          </ToolbarGroup>
        )}
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={clear} disabled={!input && !file && !expected} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane
          title={file ? "File" : "Text"}
          meta={file ? null : "Hashed as UTF-8"}
          onFileDrop={setFile}
          actions={
            <>
              {!file && <PasteButton onPaste={setInput} />}
              <OpenFileButton accept="*/*" onFile={setFile} label="Hash a file" />
            </>
          }
        >
          {file ? (
            <div className="flex h-full flex-col p-4">
              <div className="rounded-xl border border-line bg-gutter p-4">
                <div className="flex items-start gap-3">
                  <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-sunken text-ink-2">
                    <FileDigit className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-[14px] font-medium text-ink" title={file.name}>
                      {file.name}
                    </p>
                    <p className="mt-0.5 text-[12px] text-ink-3">
                      {formatBytes(file.size)}
                      {file.type && ` · ${file.type}`}
                    </p>
                  </div>
                  <Button type="button" variant="ghost" size="icon" aria-label="Remove file and hash text instead" onClick={() => setFile(null)}>
                    <X />
                  </Button>
                </div>
                {state.kind === "working" && state.total ? (
                  <div className="mt-4 h-1.5 overflow-hidden rounded-full bg-sunken" role="progressbar" aria-label="Reading file" aria-valuemin={0} aria-valuemax={state.total} aria-valuenow={state.loaded ?? 0}>
                    <div className="h-full rounded-full bg-brand transition-[width] duration-150" style={{ width: `${((state.loaded ?? 0) / state.total) * 100}%` }} />
                  </div>
                ) : null}
              </div>
              <p className="mt-3 text-[12px] text-ink-3">The file is read in this tab and never uploaded. Drop another file to replace it.</p>
            </div>
          ) : (
            <CodeEditor label="Text to hash" value={input} onChange={setInput} placeholder="Type or paste text, or drop any file here" wrap autoFocus={!handoff} />
          )}
        </Pane>

        <Pane title={hmac ? "HMACs" : "Hashes"} actions={<CopyButton text={allText} shortcut />}>
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-line py-1.5 pl-4 pr-2">
              <label htmlFor="hash-expected" className="font-mono text-[12px] text-ink-3">
                Compare
              </label>
              <input
                id="hash-expected"
                value={expected}
                onChange={(event) => setExpected(event.target.value)}
                placeholder="Paste an expected checksum to verify"
                spellCheck={false}
                autoComplete="off"
                aria-describedby="hash-match"
                className="h-7 min-w-0 flex-1 rounded-md bg-transparent px-1.5 font-mono text-[13px] text-ink outline-none placeholder:font-sans placeholder:text-ink-4 focus-visible:ring-2 focus-visible:ring-brand/30"
              />
              {expected.trim() && digests && (
                <span id="hash-match" role="status" className={cn("shrink-0 text-[12px] font-medium", match ? "text-brand" : "text-destructive")}>
                  {match ? `Matches ${prefix}${match}` : "No match"}
                </span>
              )}
            </div>
            {keyResult.error && <p className="shrink-0 border-b border-line bg-destructive/[0.04] px-4 py-2 text-[12px] text-destructive">{keyResult.error}</p>}
            {state.kind === "error" && <p className="shrink-0 border-b border-line bg-destructive/[0.04] px-4 py-2 text-[12px] text-destructive">{state.message}</p>}
            <div className="relative min-h-0 flex-1 overflow-auto">
              {rows.length ? (
                <dl>
                  {rows.map((row) => (
                    <CopyRow
                      key={row.alg}
                      label={row.label}
                      value={row.value}
                      highlighted={match === row.alg}
                      note={WEAK_ALGORITHMS.has(row.alg) && !hmac ? <span className="rounded bg-warn/10 px-1.5 text-[11px] text-warn">checksums only</span> : null}
                    />
                  ))}
                </dl>
              ) : (
                <EmptyState icon={Fingerprint} title="Type text or drop a file">
                  MD5, SHA-1, SHA-256, SHA-384 and SHA-512 show up here together.
                </EmptyState>
              )}
            </div>
          </div>
        </Pane>
      </Panes>

      <StatusBar
        kind={status.kind}
        label={status.label}
        items={state.kind === "done" ? [formatBytes(state.bytes), file ? file.name : "UTF-8 text", hmac && (key ? "Keyed" : "Empty key")] : []}
      />
    </ToolLayout>
  );
};

export default HashGenerator;
