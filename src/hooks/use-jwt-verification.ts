import React from "react";
import { verifyJwt, type DecodedJwt, type SecretEncoding, type VerifyResult } from "@/lib/jwt";

export type Verification = { kind: "idle" } | { kind: "checking" } | ({ kind: "done" } & VerifyResult);

/** Verifies the token's signature whenever the token, key or secret encoding changes. */
export const useJwtVerification = (token: DecodedJwt | null, key: string, encoding: SecretEncoding): Verification => {
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
