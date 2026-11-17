import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";
import { IV_LENGTH, type Cipher } from "@/lib/crypto/envelope";
import { encodeBytes, randomBytes, type TextFormat } from "@/lib/crypto/encoding";
import { KEY_FIELD_CLASS, type Mode } from "./shared";

interface IvFieldsProps {
  mode: Mode;
  cipher: Cipher;
  format: TextFormat;
  iv: string;
  tag: string;
  onIv: (value: string) => void;
  onTag: (value: string) => void;
}

export const IvFields = ({ mode, cipher, format, iv, tag, onIv, onTag }: IvFieldsProps) => {
  const encrypting = mode === "encrypt";
  return (
    <div className="shrink-0 border-t border-line">
      <div className="flex min-h-10 items-center gap-2 py-1 pl-4 pr-2">
        <label htmlFor="crypto-iv" className="text-[13px] font-medium text-ink">
          IV
        </label>
        <span className="truncate text-[12px] text-ink-3">{encrypting ? "random if left empty" : `${IV_LENGTH[cipher]} bytes`}</span>
        {encrypting && (
          <Button type="button" variant="ghost" size="sm" className="ml-auto" onClick={() => onIv(encodeBytes(randomBytes(IV_LENGTH[cipher]), format))}>
            <Sparkles /> Generate
          </Button>
        )}
      </div>
      <input
        id="crypto-iv"
        value={iv}
        onChange={(event) => onIv(event.target.value)}
        placeholder={encrypting ? "Leave empty for a random IV" : "The IV it was encrypted with"}
        spellCheck={false}
        autoComplete="off"
        className={KEY_FIELD_CLASS}
      />
      {!encrypting && cipher === "gcm" && (
        <>
          <div className="flex min-h-10 items-center gap-2 border-t border-line py-1 pl-4 pr-2">
            <label htmlFor="crypto-tag" className="text-[13px] font-medium text-ink">
              Tag
            </label>
            <span className="truncate text-[12px] text-ink-3">optional if it is at the end of the ciphertext</span>
          </div>
          <input id="crypto-tag" value={tag} onChange={(event) => onTag(event.target.value)} placeholder="Authentication tag (16 bytes)" spellCheck={false} autoComplete="off" className={KEY_FIELD_CLASS} />
        </>
      )}
    </div>
  );
};
