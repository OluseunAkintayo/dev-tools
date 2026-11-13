import { useSearchParams } from "react-router-dom";
import { Segmented } from "@/components/workspace/controls";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useHandoff } from "@/lib/handoff";
import type { UrlEncoding } from "@/lib/url";
import { UrlCodec } from "./Codec";
import { UrlParser } from "./Parser";

type Mode = "encode" | "decode" | "parse";

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
  { value: "parse", label: "Parse" },
];

const MODES = new Set<string>(["encode", "decode", "parse"]);

/**
 * /url-encoder-decoder?mode=encode (default) | decode | parse. All three modes share
 * one input, so a URL can be decoded and then parsed without pasting it again.
 */
const UrlTools = () => {
  const handoff = useHandoff();
  const [params, setParams] = useSearchParams();
  const requested = params.get("mode") ?? handoff?.options?.mode ?? "";
  const mode = (MODES.has(requested) ? requested : "encode") as Mode;

  const [input, setInput] = usePersistentState("url", "input", handoff?.input ?? "");
  const [encoding, setEncoding] = usePersistentState<UrlEncoding>("url", "encoding", "component");

  const goTo = (next: Mode) =>
    setParams((current) => {
      const updated = new URLSearchParams(current);
      updated.set("mode", next);
      return updated;
    });

  const modeControl = <Segmented label="Mode" value={mode} options={MODE_OPTIONS} onChange={goTo} />;

  if (mode === "parse") return <UrlParser modeControl={modeControl} input={input} onInputChange={setInput} />;

  return (
    <UrlCodec
      key={mode}
      direction={mode}
      modeControl={modeControl}
      input={input}
      onInputChange={setInput}
      encoding={encoding}
      onEncodingChange={setEncoding}
      onSwap={(text) => {
        setInput(text);
        goTo(mode === "encode" ? "decode" : "encode");
      }}
    />
  );
};

export default UrlTools;
