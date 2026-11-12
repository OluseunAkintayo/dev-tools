import React from "react";
import { ArrowUpDown, Link2 } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { Segmented } from "@/components/workspace/controls";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton } from "@/components/workspace/run";
import { outputOf, statusFor } from "@/components/workspace/status";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarLabel, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useShortcut } from "@/hooks/use-shortcut";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { byteLength, formatBytes, plural } from "@/lib/text";
import { countEscapes, decodeUrl, encodeUrl, looksDoubleEncoded, type UrlEncoding } from "@/lib/url";

const ENCODING_OPTIONS: { value: UrlEncoding; label: string }[] = [
  { value: "component", label: "Component" },
  { value: "uri", label: "Full URL" },
  { value: "form", label: "Form" },
];

const ENCODING_HINTS: Record<UrlEncoding, string> = {
  component: "For one query value or path segment. Escapes / ? & = # too.",
  uri: "For a whole URL. Keeps : / ? # & = so the URL still works.",
  form: "As HTML forms send data. Spaces become +.",
};

interface CodecProps {
  direction: "encode" | "decode";
  modeControl: React.ReactNode;
  input: string;
  onInputChange: (value: string) => void;
  encoding: UrlEncoding;
  onEncodingChange: (value: UrlEncoding) => void;
  /** Put `text` in the input and flip direction. */
  onSwap: (text: string) => void;
}

export const UrlCodec = ({ direction, modeControl, input, onInputChange, encoding, onEncodingChange, onSwap }: CodecProps) => {
  const encode = direction === "encode";
  const runner = useToolRunner(input, (text) => (encode ? encodeUrl(text, encoding) : decodeUrl(text, encoding)), [encode, encoding]);
  useShortcut({ key: "Enter", mod: true }, runner.run);

  const output = outputOf(runner) ?? "";
  const error = runner.visibleError;
  const status = statusFor(runner, { ok: encode ? "Encoded" : "Decoded", error: encode ? "Could not encode" : "Could not decode", runLabel: encode ? "Encode" : "Decode" });
  const doubleEncoded = !encode && runner.outcome.kind === "ok" && looksDoubleEncoded(output);
  const escapes = countEscapes(encode ? output : input);

  return (
    <ToolLayout toolId="url">
      <Toolbar>
        {modeControl}
        <ToolbarGroup>
          <ToolbarLabel>Encoding</ToolbarLabel>
          <Segmented label="Encoding" value={encoding} options={ENCODING_OPTIONS} onChange={onEncodingChange} />
        </ToolbarGroup>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="sm" onClick={() => onSwap(output)} disabled={!output}>
              <ArrowUpDown /> Swap
            </Button>
          </TooltipTrigger>
          <TooltipContent>Use the output as input and switch direction</TooltipContent>
        </Tooltip>
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={() => onInputChange("")} disabled={!input} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane title={encode ? "Text" : "Encoded"} actions={<PasteButton onPaste={onInputChange} />}>
          <CodeEditor
            label={encode ? "Text to encode" : "Text to decode"}
            value={input}
            onChange={onInputChange}
            placeholder={encode ? "Type or paste text, e.g. name=Ada Lovelace&city=São Paulo" : "Paste percent-encoded text, e.g. S%C3%A3o%20Paulo"}
            errorLine={error?.line}
            wrap
            autoFocus
          />
          {error && <ErrorNotice error={error} onFix={error.fix ? () => onInputChange(error.fix!.apply(input)) : undefined} />}
        </Pane>
        <Pane title={encode ? "Encoded" : "Text"} meta={ENCODING_HINTS[encoding]} actions={<CopyButton text={output} shortcut />}>
          {output ? (
            <div className="flex h-full flex-col">
              <div className="relative min-h-0 flex-1">
                <CodeView code={output} language="text" label={encode ? "Encoded output" : "Decoded text"} wrap dimmed={runner.outcome.kind === "error"} />
              </div>
              {doubleEncoded && (
                <div role="status" className="flex shrink-0 items-center gap-3 border-t border-line bg-warn/[0.06] px-4 py-2.5 text-[13px] text-warn">
                  <span className="min-w-0 flex-1">The result still contains escapes, so the input was probably encoded twice.</span>
                  <Button type="button" variant="outline" size="sm" onClick={() => onInputChange(output)}>
                    Decode again
                  </Button>
                </div>
              )}
            </div>
          ) : (
            <EmptyState icon={Link2} title={encode ? "Type or paste text to encode" : "Paste text to decode"}>
              The result shows up here as you type.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar
        kind={status.kind}
        label={status.label}
        items={runner.outcome.kind === "ok" ? [`${formatBytes(byteLength(input))} in`, `${formatBytes(byteLength(output))} out`, plural(escapes, "escape")] : []}
      />
    </ToolLayout>
  );
};
