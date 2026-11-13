import React from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeftRight, Lock, LockOpen } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { Segmented } from "@/components/workspace/controls";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton } from "@/components/workspace/actions";
import { ClearButton, RunButton } from "@/components/workspace/run";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useCryptoJob } from "@/hooks/use-crypto-job";
import { useShortcut } from "@/hooks/use-shortcut";
import { decryptAes, encryptAes, type AesKey, type KeyBits } from "@/lib/crypto/aes";
import { bytesFrom, decodeCiphertext, encodeBytes, type TextFormat } from "@/lib/crypto/encoding";
import { MAGIC } from "@/lib/crypto/envelope";
import { decryptRsa, encryptRsa, type RsaHash } from "@/lib/crypto/rsa";
import { useHandoff } from "@/lib/handoff";
import { formatBytes } from "@/lib/text";
import { AesKey as AesKeyPanel } from "./AesKey";
import { Pick } from "./Pick";
import { RsaKey } from "./RsaKey";
import {
  asBits,
  asHash,
  DECRYPT_ALGORITHMS,
  ENCRYPT_ALGORITHMS,
  FORMAT_OPTIONS,
  HASH_OPTIONS,
  INITIAL_KEYS,
  KEY_SIZE_OPTIONS,
  MODE_OPTIONS,
  type Algorithm,
  type KeyState,
  type Mode,
} from "./shared";

const SHORT_PASSPHRASE = 12;

/** /encrypt-decrypt?mode=encrypt|decrypt. Keys and text stay in memory, never in storage or the URL. */
const EncryptDecrypt = () => {
  const handoff = useHandoff();
  const [params, setParams] = useSearchParams();
  const requested = params.get("mode") ?? handoff?.options?.mode;
  const mode: Mode = requested === "decrypt" ? "decrypt" : "encrypt";
  const encrypting = mode === "encrypt";

  const [algorithm, setAlgorithm] = React.useState<Algorithm>("aes-gcm");
  const [bits, setBits] = React.useState<KeyBits>(256);
  const [format, setFormat] = React.useState<TextFormat>("base64");
  const [hash, setHash] = React.useState<RsaHash>("SHA-256");
  const [keys, setKeys] = React.useState<KeyState>(INITIAL_KEYS);
  const [plain, setPlain] = React.useState(() => (requested === "decrypt" ? "" : (handoff?.input ?? "")));
  const [encrypted, setEncrypted] = React.useState(() => (requested === "decrypt" ? (handoff?.input ?? "") : ""));
  const { job, run, reset } = useCryptoJob();

  const update = React.useCallback((patch: Partial<KeyState>) => setKeys((current) => ({ ...current, ...patch })), []);

  const rsa = algorithm === "rsa-oaep";
  const input = encrypting ? plain : encrypted;
  const setInput = encrypting ? setPlain : setEncrypted;
  const algorithms = encrypting ? ENCRYPT_ALGORITHMS : DECRYPT_ALGORITHMS;
  // Decrypt only offers "AES (detected)".
  const algorithmValue: Algorithm = !encrypting && !rsa ? "aes-gcm" : algorithm;
  const keyPresent = rsa ? Boolean(encrypting ? keys.publicKey.trim() : keys.privateKey.trim()) : keys.source === "passphrase" ? Boolean(keys.passphrase) : Boolean(keys.rawKey.trim());
  const canRun = Boolean(input.trim()) && keyPresent && job.kind !== "working";

  React.useEffect(() => {
    reset();
  }, [mode, algorithm, bits, format, hash, keys, plain, encrypted, reset]);

  const aesKey = (): AesKey =>
    keys.source === "passphrase"
      ? { kind: "passphrase", passphrase: keys.passphrase, iterations: keys.iterations }
      : { kind: "raw", text: keys.rawKey, encoding: keys.rawEncoding };

  const go = () => {
    if (!canRun) return;
    void run(async () => {
      if (encrypting) {
        const result = rsa ? await encryptRsa(plain, keys.publicKey, hash) : await encryptAes(plain, algorithm === "aes-cbc" ? "cbc" : "gcm", bits, aesKey());
        return { output: encodeBytes(result.bytes, format), label: result.label, size: result.bytes.length };
      }
      if (rsa) {
        const bytes = bytesFrom(encrypted, format);
        const result = await decryptRsa(bytes, keys.privateKey, hash);
        return { output: result.text, label: result.label, size: bytes.length };
      }
      const bytes = decodeCiphertext(encrypted, format, MAGIC);
      const result = await decryptAes(bytes, aesKey());
      return { output: result.text, label: result.label, size: bytes.length };
    });
  };
  useShortcut({ key: "Enter", mod: true }, go);

  const goTo = (next: Mode) =>
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        updated.set("mode", next);
        return updated;
      },
      // Keep router state so a handoff survives the switch.
      { state: handoff ?? undefined }
    );

  const decryptThis = () => {
    if (job.kind !== "done") return;
    setEncrypted(job.output);
    goTo("decrypt");
  };

  const clear = () => {
    setInput("");
    reset();
  };

  const notice =
    encrypting && !rsa && keys.source === "passphrase" && keys.passphrase && keys.passphrase.length < SHORT_PASSPHRASE
      ? { message: `Short passphrase. Use ${SHORT_PASSPHRASE} or more characters, or a raw key, to make it hard to guess.`, kind: "warn" as const }
      : encrypting && algorithm === "aes-cbc"
        ? { message: "AES-CBC does not detect changes to the data. Prefer AES-GCM unless you need CBC.", kind: "warn" as const }
        : null;

  const status =
    job.kind === "working"
      ? { kind: "working" as const, label: encrypting ? "Encrypting" : "Decrypting" }
      : job.kind === "done"
        ? { kind: "ok" as const, label: encrypting ? `Encrypted, ${job.label}` : `Decrypted, ${job.label}` }
        : job.kind === "error"
          ? { kind: "error" as const, label: encrypting ? "Could not encrypt" : "Could not decrypt" }
          : { kind: "idle" as const, label: keyPresent ? "Ready" : rsa ? (encrypting ? "Add a public key" : "Add a private key") : "Add a key" };

  const output = job.kind === "done" ? job.output : "";

  return (
    <ToolLayout toolId="encrypt">
      <Toolbar>
        <Segmented label="Mode" value={mode} options={MODE_OPTIONS} onChange={goTo} />
        <Pick id="crypto-algorithm" label="Algorithm" value={algorithmValue} options={algorithms} onChange={setAlgorithm} />
        {encrypting && !rsa && <Pick id="crypto-bits" label="Key size" value={String(bits)} options={KEY_SIZE_OPTIONS} onChange={(value) => setBits(asBits(value))} />}
        {rsa && <Pick id="crypto-hash" label="Hash" value={hash} options={HASH_OPTIONS} onChange={(value) => setHash(asHash(value))} />}
        <Pick id="crypto-format" label={encrypting ? "Output" : "Input"} value={format} options={FORMAT_OPTIONS} onChange={setFormat} />
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={clear} disabled={!input} />
          <RunButton label={encrypting ? "Encrypt" : "Decrypt"} icon={encrypting ? Lock : LockOpen} onClick={go} disabled={!canRun} />
        </ToolbarGroup>
      </Toolbar>

      <Panes className="border-t-0">
        <Pane title={encrypting ? "Text to encrypt" : "Encrypted text"}>
          <div className="flex h-full flex-col">
            <div className="relative min-h-0 flex-1">
              <CodeEditor
                key={mode}
                label={encrypting ? "Text to encrypt" : "Encrypted text"}
                value={input}
                onChange={setInput}
                placeholder={encrypting ? "Type or paste the text to encrypt" : "Paste the encrypted text"}
                wrap
                autoFocus
              />
              {job.kind === "error" && <ErrorNotice error={job.error} />}
            </div>
            {rsa ? <RsaKey mode={mode} keys={keys} update={update} hash={hash} /> : <AesKeyPanel mode={mode} keys={keys} update={update} bits={bits} notice={notice} />}
          </div>
        </Pane>
        <Pane
          title={encrypting ? "Encrypted text" : "Decrypted text"}
          actions={
            <>
              {encrypting && (
                <Button type="button" variant="outline" size="sm" onClick={decryptThis} disabled={!output}>
                  <ArrowLeftRight /> Decrypt this
                </Button>
              )}
              <CopyButton text={output} shortcut />
            </>
          }
        >
          {output ? (
            <CodeView code={output} language="text" label={encrypting ? "Encrypted text" : "Decrypted text"} wrap />
          ) : (
            <EmptyState icon={encrypting ? Lock : LockOpen} title={encrypting ? "Nothing encrypted yet" : "Nothing decrypted yet"}>
              {encrypting ? "Add text and a key, then choose Encrypt." : "Paste encrypted text and its key, then choose Decrypt."} Everything stays in this tab.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar kind={status.kind} label={status.label} items={job.kind === "done" ? [encrypting ? `${formatBytes(job.size)} encrypted` : formatBytes(job.size)] : []} />
    </ToolLayout>
  );
};

export default EncryptDecrypt;
