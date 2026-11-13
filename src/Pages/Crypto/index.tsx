import React from "react";
import { useSearchParams } from "react-router-dom";
import { ArrowLeftRight, Lock, LockOpen } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { Segmented } from "@/components/workspace/controls";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyRow } from "@/components/workspace/CopyRow";
import { CopyButton } from "@/components/workspace/actions";
import { ClearButton, RunButton } from "@/components/workspace/run";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useCryptoJob } from "@/hooks/use-crypto-job";
import { useShortcut } from "@/hooks/use-shortcut";
import { decryptAes, decryptAesRaw, encryptAes, encryptAesRaw, type AesKey, type KeyBits } from "@/lib/crypto/aes";
import { bytesFrom, decodeCiphertext, encodeBytes, readField, type TextFormat } from "@/lib/crypto/encoding";
import { MAGIC, type Cipher } from "@/lib/crypto/envelope";
import { decryptRsa, encryptRsa, type RsaHash } from "@/lib/crypto/rsa";
import { useHandoff } from "@/lib/handoff";
import { formatBytes } from "@/lib/text";
import { AesKey as AesKeyPanel } from "./AesKey";
import { IvFields } from "./IvFields";
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
  LAYOUT_OPTIONS,
  MODE_OPTIONS,
  type Algorithm,
  type KeyState,
  type Layout,
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
  const [layout, setLayout] = React.useState<Layout>("packaged");
  const [iv, setIv] = React.useState("");
  const [tag, setTag] = React.useState("");
  const [hash, setHash] = React.useState<RsaHash>("SHA-256");
  const [keys, setKeys] = React.useState<KeyState>(INITIAL_KEYS);
  const [plain, setPlain] = React.useState(() => (requested === "decrypt" ? "" : (handoff?.input ?? "")));
  const [encrypted, setEncrypted] = React.useState(() => (requested === "decrypt" ? (handoff?.input ?? "") : ""));
  const { job, run, reset } = useCryptoJob();

  const update = React.useCallback((patch: Partial<KeyState>) => setKeys((current) => ({ ...current, ...patch })), []);

  const rsa = algorithm === "rsa-oaep";
  const input = encrypting ? plain : encrypted;
  const setInput = encrypting ? setPlain : setEncrypted;
  const rawLayout = !rsa && layout === "raw";
  const cipher: Cipher = algorithm === "aes-cbc" ? "cbc" : "gcm";
  const algorithms = encrypting || rawLayout ? ENCRYPT_ALGORITHMS : DECRYPT_ALGORITHMS;
  // Packaged decrypt reads the cipher from the text, so it only offers "AES (detected)".
  const algorithmValue: Algorithm = !encrypting && !rsa && !rawLayout ? "aes-gcm" : algorithm;
  const aesKeys: KeyState = rawLayout ? { ...keys, source: "raw" } : keys;
  const keyPresent = rsa ? Boolean(encrypting ? keys.publicKey.trim() : keys.privateKey.trim()) : aesKeys.source === "passphrase" ? Boolean(aesKeys.passphrase) : Boolean(aesKeys.rawKey.trim());
  const canRun = Boolean(input.trim()) && keyPresent && (!rawLayout || encrypting || Boolean(iv.trim())) && job.kind !== "working";

  React.useEffect(() => {
    reset();
  }, [mode, algorithm, bits, format, hash, keys, layout, iv, tag, plain, encrypted, reset]);

  const aesKey = (): AesKey =>
    aesKeys.source === "passphrase"
      ? { kind: "passphrase", passphrase: aesKeys.passphrase, iterations: aesKeys.iterations }
      : { kind: "raw", text: aesKeys.rawKey, encoding: aesKeys.rawEncoding };

  const go = () => {
    if (!canRun) return;
    void run(async () => {
      if (rawLayout && encrypting) {
        const result = await encryptAesRaw(plain, cipher, bits, aesKeys.rawKey, aesKeys.rawEncoding, iv.trim() ? readField("IV", iv, format) : null);
        const parts = [{ label: "IV", value: encodeBytes(result.iv, format) }, ...(result.tag ? [{ label: "Tag", value: encodeBytes(result.tag, format) }] : [])];
        return { output: encodeBytes(result.data, format), label: result.label, size: result.data.length + (result.tag?.length ?? 0), parts };
      }
      if (rawLayout) {
        const data = readField("Ciphertext", encrypted, format);
        const tagBytes = cipher === "gcm" && tag.trim() ? readField("Tag", tag, format) : null;
        const result = await decryptAesRaw(cipher, data, readField("IV", iv, format), tagBytes, aesKeys.rawKey, aesKeys.rawEncoding);
        return { output: result.text, label: result.label, size: data.length + (tagBytes?.length ?? 0) };
      }
      if (encrypting) {
        const result = rsa ? await encryptRsa(plain, keys.publicKey, hash) : await encryptAes(plain, cipher, bits, aesKey());
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
    if (job.parts) {
      setIv(job.parts.find((part) => part.label === "IV")?.value ?? "");
      setTag(job.parts.find((part) => part.label === "Tag")?.value ?? "");
    }
    goTo("decrypt");
  };

  const clear = () => {
    setInput("");
    reset();
  };

  const notice =
    encrypting && !rsa && aesKeys.source === "passphrase" && aesKeys.passphrase && aesKeys.passphrase.length < SHORT_PASSPHRASE
      ? { message: `Short passphrase. Use ${SHORT_PASSPHRASE} or more characters, or a raw key, to make it hard to guess.`, kind: "warn" as const }
      : encrypting && rawLayout && iv.trim()
        ? { message: "Never reuse an IV with the same key; with AES-GCM it exposes the data. Leave it empty for a random one.", kind: "warn" as const }
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
        {!rsa && <Pick id="crypto-layout" label="Layout" value={layout} options={LAYOUT_OPTIONS} onChange={setLayout} />}
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
        <Pane title={encrypting ? "Text to encrypt" : rawLayout ? "Ciphertext" : "Encrypted text"}>
          <div className="flex h-full flex-col">
            <div className="relative min-h-0 flex-1">
              <CodeEditor
                key={mode}
                label={encrypting ? "Text to encrypt" : rawLayout ? "Ciphertext" : "Encrypted text"}
                value={input}
                onChange={setInput}
                placeholder={encrypting ? "Type or paste the text to encrypt" : "Paste the encrypted text"}
                wrap
                autoFocus
              />
              {job.kind === "error" && <ErrorNotice error={job.error} />}
            </div>
            {rawLayout && <IvFields mode={mode} cipher={cipher} format={format} iv={iv} tag={tag} onIv={setIv} onTag={setTag} />}
            {rsa ? <RsaKey mode={mode} keys={keys} update={update} hash={hash} /> : <AesKeyPanel mode={mode} keys={aesKeys} update={update} bits={bits} rawOnly={rawLayout} notice={notice} />}
          </div>
        </Pane>
        <Pane
          title={encrypting ? (rawLayout ? "Ciphertext" : "Encrypted text") : "Decrypted text"}
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
            <div className="flex h-full flex-col">
              <div className="relative min-h-0 flex-1">
                <CodeView code={output} language="text" label={encrypting ? "Encrypted text" : "Decrypted text"} wrap />
              </div>
              {job.kind === "done" && job.parts && (
                <dl className="shrink-0 border-t border-line">
                  {job.parts.map((part) => (
                    <CopyRow key={part.label} label={part.label} value={part.value} />
                  ))}
                </dl>
              )}
            </div>
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
