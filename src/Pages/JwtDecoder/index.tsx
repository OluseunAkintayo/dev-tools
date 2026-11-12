import React from "react";
import { Segmented } from "@/components/workspace/controls";
import { useHandoff } from "@/lib/handoff";
import { JwtDecode, type DecodeSeed } from "./Decode";
import { JwtEncode, type EncodeSeed } from "./Encode";

type Mode = "decode" | "encode";

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "decode", label: "Decode" },
  { value: "encode", label: "Encode" },
];

/** Each mode keeps its own state; switching with a seed carries a token or payload across. */
type State = { mode: "decode"; seed?: DecodeSeed; version: number } | { mode: "encode"; seed?: EncodeSeed; version: number };

const JwtTool = () => {
  const handoff = useHandoff();
  const [state, setState] = React.useState<State>({ mode: handoff?.options?.mode === "encode" ? "encode" : "decode", version: 0 });

  // The last state of each mode, so switching back restores what was there.
  const decodeSnapshot = React.useRef<DecodeSeed>();
  const encodeSnapshot = React.useRef<EncodeSeed>();

  const saveDecode = React.useCallback((snapshot: DecodeSeed) => (decodeSnapshot.current = snapshot), []);
  const saveEncode = React.useCallback((snapshot: EncodeSeed) => (encodeSnapshot.current = snapshot), []);

  const setMode = (mode: Mode) =>
    setState((current) =>
      mode === "decode"
        ? { mode, seed: decodeSnapshot.current, version: current.version + 1 }
        : { mode, seed: encodeSnapshot.current, version: current.version + 1 }
    );
  const modeControl = <Segmented label="Mode" value={state.mode} options={MODE_OPTIONS} onChange={setMode} />;

  return state.mode === "decode" ? (
    <JwtDecode
      key={state.version}
      modeControl={modeControl}
      seed={state.seed}
      onSnapshot={saveDecode}
      onEditPayload={(seed) => setState((current) => ({ mode: "encode", seed, version: current.version + 1 }))}
    />
  ) : (
    <JwtEncode
      key={state.version}
      modeControl={modeControl}
      seed={state.seed}
      onSnapshot={saveEncode}
      onVerify={(seed) => setState((current) => ({ mode: "decode", seed, version: current.version + 1 }))}
    />
  );
};

export default JwtTool;
