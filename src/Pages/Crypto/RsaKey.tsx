import React from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useCopy } from "@/hooks/use-copy";
import { generateRsaPair, type RsaHash } from "@/lib/crypto/rsa";
import { toToolError } from "@/lib/toolError";
import { Pick } from "./Pick";
import { asRsaBits, KEY_FIELD_CLASS, RSA_SIZE_OPTIONS, type KeyState, type KeyUpdate, type Mode } from "./shared";

interface RsaKeyProps {
  mode: Mode;
  keys: KeyState;
  update: KeyUpdate;
  hash: RsaHash;
}

/** The key area under the input for RSA: the public key to encrypt, or the private key to decrypt. */
export const RsaKey = ({ mode, keys, update, hash }: RsaKeyProps) => {
  const copy = useCopy();
  const [generating, setGenerating] = React.useState(false);
  const [problem, setProblem] = React.useState<string | null>(null);
  const encrypting = mode === "encrypt";
  const value = encrypting ? keys.publicKey : keys.privateKey;

  const generate = async () => {
    setGenerating(true);
    setProblem(null);
    try {
      const pair = await generateRsaPair(keys.rsaBits, hash);
      update({ publicKey: pair.publicKey, privateKey: pair.privateKey });
    } catch (err) {
      setProblem(toToolError(err).message);
    } finally {
      setGenerating(false);
    }
  };

  return (
    <div className="shrink-0 border-t border-line">
      <div className="flex min-h-10 flex-wrap items-center gap-x-2 gap-y-1 py-1 pl-4 pr-2">
        <label htmlFor="crypto-key" className="text-[13px] font-medium text-ink">
          {encrypting ? "Public key" : "Private key"}
        </label>
        <span className="text-[12px] text-ink-3">PEM or JWK</span>
        <div className="ml-auto flex items-center gap-1.5">
          <Pick id="crypto-rsa-size" label="Size" value={String(keys.rsaBits)} options={RSA_SIZE_OPTIONS} onChange={(bits) => update({ rsaBits: asRsaBits(bits) })} />
          <Button type="button" variant="ghost" size="sm" onClick={generate} disabled={generating}>
            <Sparkles /> {generating ? "Generating" : "Generate pair"}
          </Button>
        </div>
      </div>
      <textarea
        id="crypto-key"
        value={value}
        onChange={(event) => update(encrypting ? { publicKey: event.target.value } : { privateKey: event.target.value })}
        placeholder={encrypting ? "-----BEGIN PUBLIC KEY-----" : "-----BEGIN PRIVATE KEY-----"}
        spellCheck={false}
        autoComplete="off"
        rows={4}
        className={`${KEY_FIELD_CLASS} resize-none`}
      />
      <div className="flex flex-wrap items-center gap-1.5 border-t border-line px-2 py-1.5">
        <Button type="button" variant="ghost" size="sm" disabled={!keys.publicKey} onClick={() => copy(keys.publicKey)}>
          Copy public key
        </Button>
        <Button type="button" variant="ghost" size="sm" disabled={!keys.privateKey} onClick={() => copy(keys.privateKey)}>
          Copy private key
        </Button>
        {problem && (
          <span role="alert" className="text-[12px] text-destructive">
            {problem}
          </span>
        )}
      </div>
    </div>
  );
};
