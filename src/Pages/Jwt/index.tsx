import React from "react";
import { useSearchParams } from "react-router-dom";
import { Segmented } from "@/components/workspace/controls";
import { useHandoff } from "@/lib/handoff";
import { JwtDecode, type DecodeSeed } from "./Decode";
import { JwtEncode, type EncodeSeed } from "./Encode";

type Mode = "decode" | "encode";

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "decode", label: "Decode" },
  { value: "encode", label: "Encode" },
];

/** A token or payload handed from one mode to the other (Verify, Edit and re-sign). */
type Transfer = { mode: "decode"; seed: DecodeSeed } | { mode: "encode"; seed: EncodeSeed };

/**
 * /jwt?mode=decode (default) or /jwt?mode=encode. The mode lives in the URL so it can be
 * linked to and survives back/forward; each mode's inputs are kept while switching.
 */
const JwtTool = () => {
  const handoff = useHandoff();
  const [params, setParams] = useSearchParams();
  const requested = params.get("mode") ?? handoff?.options?.mode;
  const mode: Mode = requested === "encode" ? "encode" : "decode";

  // The last state of each mode, so switching back restores what was there.
  // A transfer (Verify, Edit and re-sign) simply overwrites the target mode's snapshot.
  const decodeSnapshot = React.useRef<DecodeSeed>();
  const encodeSnapshot = React.useRef<EncodeSeed>();
  const saveDecode = React.useCallback((snapshot: DecodeSeed) => {
    decodeSnapshot.current = snapshot;
  }, []);
  const saveEncode = React.useCallback((snapshot: EncodeSeed) => {
    encodeSnapshot.current = snapshot;
  }, []);

  const goTo = (next: Mode) =>
    setParams(
      (current) => {
        const updated = new URLSearchParams(current);
        updated.set("mode", next);
        return updated;
      },
      // Keep router state so a handoff from another tool is not lost on the first switch.
      { state: handoff ?? undefined }
    );

  const send = (transfer: Transfer) => {
    if (transfer.mode === "decode") decodeSnapshot.current = transfer.seed;
    else encodeSnapshot.current = transfer.seed;
    goTo(transfer.mode);
  };

  const modeControl = <Segmented label="Mode" value={mode} options={MODE_OPTIONS} onChange={goTo} />;

  // key={mode} remounts the panel on every switch, so it starts from its snapshot.
  return mode === "decode" ? (
    <JwtDecode key="decode" modeControl={modeControl} seed={decodeSnapshot.current} onSnapshot={saveDecode} onEditPayload={(seed) => send({ mode: "encode", seed })} />
  ) : (
    <JwtEncode key="encode" modeControl={modeControl} seed={encodeSnapshot.current} onSnapshot={saveEncode} onVerify={(seed) => send({ mode: "decode", seed })} />
  );
};

export default JwtTool;
