import React from "react";
import { ArrowLeftRight, FileJson } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { Segmented } from "@/components/workspace/controls";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, DownloadButton, OpenFileButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton, RunButton } from "@/components/workspace/run";
import { outputOf, statusFor } from "@/components/workspace/status";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarLabel, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useFileLoader } from "@/hooks/use-file-loader";
import { useShortcut } from "@/hooks/use-shortcut";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { csvToObjects } from "@/lib/csv";
import { useHandoff } from "@/lib/handoff";
import { plural } from "@/lib/text";

type DelimiterChoice = "," | ";" | "\t" | "|" | "custom";

const DELIMITER_OPTIONS: { value: DelimiterChoice; label: string }[] = [
  { value: ",", label: "Comma" },
  { value: ";", label: "Semicolon" },
  { value: "\t", label: "Tab" },
  { value: "|", label: "Pipe" },
  { value: "custom", label: "Other" },
];

const initialChoice = (delimiter?: string): DelimiterChoice =>
  delimiter && DELIMITER_OPTIONS.some((option) => option.value === delimiter) ? (delimiter as DelimiterChoice) : ",";

const CsvToJson = () => {
  const handoff = useHandoff();
  const [input, setInput] = React.useState(handoff?.input ?? "");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [choice, setChoice] = React.useState<DelimiterChoice>(() => initialChoice(handoff?.options?.delimiter));
  const [custom, setCustom] = React.useState("");

  const delimiter = choice === "custom" ? (custom === "\\t" ? "\t" : custom) : choice;

  const runner = useToolRunner(
    input,
    (text) => {
      if (delimiter.length !== 1) throw new Error("The delimiter must be a single character. Use \\t for tab.");
      const rows = csvToObjects(text, delimiter);
      return { json: JSON.stringify(rows, null, 2), rows: rows.length, columns: rows[0] ? Object.keys(rows[0]).length : 0 };
    },
    [delimiter]
  );
  useShortcut({ key: "Enter", mod: true }, runner.run);

  const files = useFileLoader({
    extensions: [".csv", ".tsv", ".txt"],
    onLoad: (text, file) => {
      setInput(text);
      setFileName(file.name);
      if (file.name.toLowerCase().endsWith(".tsv")) setChoice("\t");
    },
  });

  const result = outputOf(runner);
  const output = result?.json ?? "";
  const status = statusFor(runner, { ok: "Converted", error: "Could not convert", runLabel: "Convert" });
  const error = runner.visibleError;

  const clear = () => {
    setInput("");
    setFileName(null);
  };

  return (
    <ToolLayout
      toolId="csv-to-json"
      next={[
        { to: "json-to-interface", label: "Generate interface from this", handoff: output ? { input: output } : undefined },
        { to: "json-formatter", label: "Open in JSON Formatter", handoff: output ? { input: output } : undefined },
      ]}
    >
      <Toolbar>
        <ToolbarGroup>
          <ToolbarLabel>Delimiter</ToolbarLabel>
          <Segmented label="Delimiter" value={choice} options={DELIMITER_OPTIONS} onChange={setChoice} />
          {choice === "custom" && (
            <input
              aria-label="Custom delimiter"
              value={custom}
              maxLength={2}
              autoFocus
              onChange={(event) => setCustom(event.target.value)}
              placeholder="e.g. ~"
              className="h-8 w-16 rounded-lg border border-line-strong bg-surface px-2 text-center font-mono text-[13px] text-ink outline-none focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
            />
          )}
        </ToolbarGroup>
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={clear} disabled={!input} />
          <RunButton label="Convert" icon={ArrowLeftRight} onClick={runner.run} disabled={!input.trim()} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane
          title="CSV"
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
            label="CSV input"
            value={input}
            onChange={setInput}
            placeholder="Paste CSV with a header row, or drop a .csv file"
            autoFocus={!handoff}
          />
          {error && <ErrorNotice error={error} />}
        </Pane>
        <Pane
          title="JSON"
          actions={
            <>
              <CopyButton text={output} shortcut />
              <DownloadButton content={output} filename="data.json" mimeType="application/json" />
            </>
          }
        >
          {output ? (
            <CodeView code={output} language="json" label="JSON output" dimmed={runner.outcome.kind === "error"} />
          ) : (
            <EmptyState icon={FileJson} title="Drop a .csv file or paste into CSV">
              The first row is used as the keys. The JSON shows up here as you type.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar
        kind={status.kind}
        label={status.label}
        items={runner.outcome.kind === "ok" && result ? [plural(result.rows, "row"), plural(result.columns, "column")] : []}
      />
    </ToolLayout>
  );
};

export default CsvToJson;
