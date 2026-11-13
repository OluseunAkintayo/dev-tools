import React from "react";
import { Eye, EyeOff, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Segmented } from "@/components/workspace/controls";
import { KeyNotice } from "@/components/workspace/KeyNotice";
import { generateRawKey, ITERATION_OPTIONS, type KeyBits } from "@/lib/crypto/aes";
import { Pick } from "./Pick";
import { KEY_FIELD_CLASS, RAW_ENCODING_OPTIONS, SOURCE_OPTIONS, type KeyState, type KeyUpdate, type Mode } from "./shared";

interface AesKeyProps {
  mode: Mode;
  keys: KeyState;
  update: KeyUpdate;
  /** Raw keys are generated at this size. */
  bits: KeyBits;
  notice: { message: string; kind: "warn" } | null;
}

const iterationOptions = (current: number) => {
  const values = ITERATION_OPTIONS.includes(current) ? ITERATION_OPTIONS : [...ITERATION_OPTIONS, current].sort((a, b) => a - b);
  return values.map((value) => ({ value: String(value), label: `${value.toLocaleString()} iterations` }));
};

/** The key area under the input for AES: a passphrase to derive a key from, or a raw key. */
export const AesKey = ({ mode, keys, update, bits, notice }: AesKeyProps) => {
  const [shown, setShown] = React.useState(false);
  const passphrase = keys.source === "passphrase";

  return (
    <div className="shrink-0 border-t border-line">
      <div className="flex min-h-10 flex-wrap items-center gap-x-2 gap-y-1 py-1 pl-4 pr-2">
        <label htmlFor="crypto-key" className="text-[13px] font-medium text-ink">
          Key
        </label>
        <Segmented label="Key source" value={keys.source} options={SOURCE_OPTIONS} onChange={(source) => update({ source })} />
        <div className="ml-auto flex items-center gap-1.5">
          {passphrase && mode === "encrypt" && <Pick id="crypto-iterations" label="Cost" value={String(keys.iterations)} options={iterationOptions(keys.iterations)} onChange={(value) => update({ iterations: Number(value) })} />}
          {!passphrase && <Segmented label="Key encoding" value={keys.rawEncoding} options={RAW_ENCODING_OPTIONS} onChange={(rawEncoding) => update({ rawEncoding })} />}
          {!passphrase && mode === "encrypt" && (
            <Button type="button" variant="ghost" size="sm" onClick={() => update({ rawKey: generateRawKey(bits, keys.rawEncoding) })}>
              <Sparkles /> Generate
            </Button>
          )}
        </div>
      </div>
      {passphrase ? (
        <div className="relative">
          <input
            id="crypto-key"
            type={shown ? "text" : "password"}
            value={keys.passphrase}
            onChange={(event) => update({ passphrase: event.target.value })}
            placeholder={mode === "encrypt" ? "Passphrase to encrypt with" : "Passphrase it was encrypted with"}
            spellCheck={false}
            autoComplete="off"
            className={`${KEY_FIELD_CLASS} pr-11`}
          />
          <button
            type="button"
            onClick={() => setShown((value) => !value)}
            aria-label={shown ? "Hide passphrase" : "Show passphrase"}
            aria-pressed={shown}
            className="press absolute right-2 top-1/2 grid h-7 w-7 -translate-y-1/2 place-items-center rounded-md text-ink-3 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
          >
            {shown ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
          </button>
        </div>
      ) : (
        <textarea
          id="crypto-key"
          value={keys.rawKey}
          onChange={(event) => update({ rawKey: event.target.value })}
          placeholder={mode === "encrypt" ? `A ${bits}-bit key (${bits / 4} hex characters), or generate one` : "The key it was encrypted with"}
          spellCheck={false}
          autoComplete="off"
          rows={2}
          className={`${KEY_FIELD_CLASS} resize-none`}
        />
      )}
      <KeyNotice message={notice?.message ?? null} kind={notice?.kind ?? null} />
    </div>
  );
};
