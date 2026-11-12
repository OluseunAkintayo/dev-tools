import React from "react";
import { ArrowUpDown, Binary, LockKeyhole, LockKeyholeOpen } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { Segmented } from "@/components/workspace/controls";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, DownloadButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton, RunButton } from "@/components/workspace/run";
import { outputOf, statusFor } from "@/components/workspace/status";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useShortcut } from "@/hooks/use-shortcut";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { decodeFromBase64, encodeToBase64, validateBase64Input } from "@/lib/base64";
import { useHandoff } from "@/lib/handoff";
import { byteLength, formatBytes } from "@/lib/text";

type Mode = "encode" | "decode";

const MODE_OPTIONS: { value: Mode; label: string }[] = [
  { value: "encode", label: "Encode" },
  { value: "decode", label: "Decode" },
];

const Base64EncoderDecoder = () => {
  const handoff = useHandoff();
  const [mode, setMode] = React.useState<Mode>(handoff?.options?.mode === "decode" ? "decode" : "encode");
  const [input, setInput] = React.useState(handoff?.input ?? "");

  const runner = useToolRunner(
    input,
    (text) => {
      if (mode === "encode") return encodeToBase64(text);
      const validation = validateBase64Input(text);
      if (!validation.isValid) throw new Error(validation.error ?? "Invalid Base64.");
      return decodeFromBase64(text);
    },
    [mode]
  );
  useShortcut({ key: "Enter", mod: true }, runner.run);

  const output = outputOf(runner) ?? "";
  const isEncode = mode === "encode";
  const status = statusFor(runner, {
    ok: isEncode ? "Encoded" : "Decoded",
    error: isEncode ? "Could not encode" : "Invalid Base64",
    runLabel: isEncode ? "Encode" : "Decode",
  });
  const error = runner.visibleError;
  const sizes = React.useMemo(
    () => (output ? [`${formatBytes(byteLength(input))} in`, `${formatBytes(byteLength(output))} out`] : []),
    [input, output]
  );

  /** Move the result into the input and flip direction, for quick round-trips. */
  const swap = () => {
    if (!output) return;
    setInput(output);
    setMode(isEncode ? "decode" : "encode");
  };

  return (
    <ToolLayout toolId="base64">
      <Toolbar>
        <Segmented label="Direction" value={mode} options={MODE_OPTIONS} onChange={setMode} />
        <Tooltip>
          <TooltipTrigger asChild>
            <Button type="button" variant="ghost" size="sm" onClick={swap} disabled={!output}>
              <ArrowUpDown /> Swap
            </Button>
          </TooltipTrigger>
          <TooltipContent>Use the output as input and switch direction</TooltipContent>
        </Tooltip>
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={() => setInput("")} disabled={!input} />
          <RunButton label={isEncode ? "Encode" : "Decode"} icon={isEncode ? LockKeyhole : LockKeyholeOpen} onClick={runner.run} disabled={!input.trim()} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane title={isEncode ? "Text" : "Base64"} actions={<PasteButton onPaste={setInput} />}>
          <CodeEditor
            label={isEncode ? "Text to encode" : "Base64 to decode"}
            value={input}
            onChange={setInput}
            placeholder={isEncode ? "Type or paste text to encode" : "Paste a Base64 string. URL-safe input works too."}
            wrap
            autoFocus={!handoff}
          />
          {error && <ErrorNotice error={error} />}
        </Pane>
        <Pane
          title={isEncode ? "Base64" : "Text"}
          actions={
            <>
              <CopyButton text={output} shortcut />
              <DownloadButton
                content={output}
                filename={isEncode ? "encoded-base64.txt" : "decoded-text.txt"}
                mimeType="text/plain"
              />
            </>
          }
        >
          {output ? (
            <CodeView code={output} language="text" label={isEncode ? "Base64 output" : "Decoded text"} wrap dimmed={runner.outcome.kind === "error"} />
          ) : (
            <EmptyState icon={Binary} title={isEncode ? "Type or paste text" : "Paste a Base64 string"}>
              The result shows up here as you type.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar kind={status.kind} label={status.label} items={runner.outcome.kind === "ok" ? [...sizes, "UTF-8"] : []} />
    </ToolLayout>
  );
};

export default Base64EncoderDecoder;
