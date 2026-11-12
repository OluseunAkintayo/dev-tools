import React from "react";
import { FileJson, WandSparkles } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { Segmented, Switch } from "@/components/workspace/controls";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, DownloadButton, OpenFileButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton, RunButton } from "@/components/workspace/run";
import { outputOf, statusFor } from "@/components/workspace/status";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarLabel, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useFileLoader } from "@/hooks/use-file-loader";
import { useShortcut } from "@/hooks/use-shortcut";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { useHandoff } from "@/lib/handoff";
import { byteLength, countLines, formatBytes, plural } from "@/lib/text";
import { parseJson } from "@/lib/toolError";

type Indent = "2" | "4" | "tab";

const INDENT_OPTIONS: { value: Indent; label: string }[] = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
  { value: "tab", label: "Tab" },
];

const sortKeysDeep = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map(sortKeysDeep);
  if (typeof value === "object" && value !== null) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, sortKeysDeep((value as Record<string, unknown>)[key])])
    );
  }
  return value;
};

const JsonFormatter = () => {
  const handoff = useHandoff();
  const [input, setInput] = React.useState(handoff?.input ?? "");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [indent, setIndent] = React.useState<Indent>("2");
  const [sortKeys, setSortKeys] = React.useState(false);

  const runner = useToolRunner(
    input,
    (text) => {
      const data = parseJson(text);
      return JSON.stringify(sortKeys ? sortKeysDeep(data) : data, null, indent === "tab" ? "\t" : Number(indent));
    },
    [indent, sortKeys]
  );
  useShortcut({ key: "Enter", mod: true }, runner.run);

  const files = useFileLoader({
    extensions: [".json"],
    onLoad: (text, file) => {
      setInput(text);
      setFileName(file.name);
    },
  });

  const output = outputOf(runner) ?? "";
  const status = statusFor(runner, { ok: "Valid JSON", error: "Invalid JSON", runLabel: "Format" });
  const indentLabel = INDENT_OPTIONS.find((option) => option.value === indent)?.label;
  const outputStats = React.useMemo(() => (output ? [plural(countLines(output), "line"), formatBytes(byteLength(output))] : []), [output]);
  const error = runner.visibleError;

  const clear = () => {
    setInput("");
    setFileName(null);
  };

  return (
    <ToolLayout
      toolId="json-formatter"
      next={[
        { to: "json-to-interface", label: "Generate interface from this", handoff: output ? { input: output } : undefined },
        { to: "json-to-csv", label: "Convert to CSV", handoff: output ? { input: output } : undefined },
        { to: "json-to-xml", label: "Convert to XML", handoff: output ? { input: output } : undefined },
      ]}
    >
      <Toolbar>
        <ToolbarGroup>
          <ToolbarLabel>Indent</ToolbarLabel>
          <Segmented label="Indentation" value={indent} options={INDENT_OPTIONS} onChange={setIndent} />
        </ToolbarGroup>
        <Switch label="Sort keys" checked={sortKeys} onChange={setSortKeys} />
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={clear} disabled={!input} />
          <RunButton label="Format" icon={WandSparkles} onClick={runner.run} disabled={!input.trim()} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane
          title="Input"
          titleId="json-input-title"
          meta={fileName}
          onFileDrop={files.load}
          actions={
            <>
              <PasteButton onPaste={setInput} />
              <OpenFileButton accept={files.accept} onFile={files.load} disabled={files.loading} />
            </>
          }
        >
          <CodeEditor
            id="json-input"
            label="JSON input"
            value={input}
            onChange={setInput}
            placeholder="Paste JSON here, or drop a .json file"
            errorLine={error?.line}
            autoFocus={!handoff}
          />
          {error && <ErrorNotice error={error} onFix={error.fix ? () => setInput(error.fix!.apply(input)) : undefined} />}
        </Pane>

        <Pane
          title="Output"
          actions={
            <>
              <CopyButton text={output} shortcut />
              <DownloadButton content={output} filename="formatted.json" mimeType="application/json" />
            </>
          }
        >
          {output ? (
            <CodeView code={output} language="json" label="Formatted JSON" dimmed={runner.outcome.kind === "error"} />
          ) : (
            <EmptyState icon={FileJson} title="Drop a .json file or paste into Input">
              The result shows up here as you type.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar kind={status.kind} label={status.label} items={runner.outcome.kind === "ok" ? [...outputStats, indentLabel, sortKeys && "Keys sorted"] : []} />
    </ToolLayout>
  );
};

export default JsonFormatter;
