import React from "react";
import { signJwt, type SecretEncoding, type SignResult, type SigningAlg } from "@/lib/jwt";

export type Signing = { kind: "idle" } | { kind: "signing" } | ({ kind: "done" } & SignResult);

/**
 * Re-signs the token whenever its inputs change. Stays idle until the header and
 * payload are valid (not undefined) and a key is present.
 */
export const useJwtSigning = (
  alg: SigningAlg,
  header: Record<string, unknown> | undefined,
  payload: unknown,
  key: string,
  encoding: SecretEncoding
): Signing => {
  const [state, setState] = React.useState<Signing>({ kind: "idle" });
  const deferredKey = React.useDeferredValue(key);

  React.useEffect(() => {
    if (payload === undefined || header === undefined || !deferredKey) {
      setState({ kind: "idle" });
      return;
    }
    let cancelled = false;
    setState({ kind: "signing" });
    signJwt(alg, header, payload, deferredKey, encoding).then((result) => {
      if (!cancelled) setState({ kind: "done", ...result });
    });
    return () => {
      cancelled = true;
    };
  }, [alg, header, payload, deferredKey, encoding]);

  return state;
};
