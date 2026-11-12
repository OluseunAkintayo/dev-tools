import { ShieldAlert, ShieldCheck, ShieldQuestion } from "lucide-react";
import type { Verification } from "@/hooks/use-jwt-verification";
import { cn } from "@/lib/utils";

interface VerificationLineProps {
  verification: Verification;
  hasToken: boolean;
  /** Why this token cannot be verified at all (alg "none", unsupported alg), if so. */
  unverifiable: string | null;
}

/** One-line signature status under the key field in Decode mode. */
export const VerificationLine = ({ verification, hasToken, unverifiable }: VerificationLineProps) => {
  const done = verification.kind === "done";
  const Icon = unverifiable ? ShieldAlert : done ? (verification.valid ? ShieldCheck : ShieldAlert) : ShieldQuestion;
  const message = unverifiable
    ? unverifiable
    : !hasToken
      ? "Paste a token to verify its signature."
      : verification.kind === "idle"
        ? "Signature not checked. Add a key to verify it."
        : verification.kind === "checking"
          ? "Checking signature…"
          : verification.message;
  const tone = unverifiable ? "text-warn" : done ? (verification.valid ? "text-brand" : "text-destructive") : "text-ink-3";

  return (
    <p role="status" aria-live="polite" className={cn("flex items-start gap-2 border-t border-line px-4 py-2.5 text-[13px] leading-5", tone)}>
      <Icon className="mt-0.5 h-4 w-4 shrink-0" />
      {message}
    </p>
  );
};
