import React from "react";
import { ArrowLeftRight, Sheet } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { Segmented } from "@/components/workspace/controls";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, DownloadButton, OpenFileButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton, RunButton } from "@/components/workspace/run";
import { outputOf, statusFor } from "@/components/workspace/status";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useFileLoader } from "@/hooks/use-file-loader";
import { useShortcut } from "@/hooks/use-shortcut";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { useHandoff } from "@/lib/handoff";
import { jsonToCsv } from "@/lib/jsonToCsv";
import { plural } from "@/lib/text";
import { DataTable } from "./DataTable";

type View = "table" | "csv";

const JsonToCsv = () => {
  const handoff = useHandoff();
  const [input, setInput] = React.useState(handoff?.input ?? "");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [view, setView] = React.useState<View>("table");

  const runner = useToolRunner(input, jsonToCsv, []);
  useShortcut({ key: "Enter", mod: true }, runner.run);

  const files = useFileLoader({
    extensions: [".json"],
    maxBytes: 5 * 1024 * 1024,
    onLoad: (text, file) => {
      setInput(text);
      setFileName(file.name);
    },
  });

  const result = outputOf(runner);
  const csv = result?.csv ?? "";
  const status = statusFor(runner, { ok: "Converted", error: "Could not convert", runLabel: "Convert" });
  const error = runner.visibleError;
  const dimmed = runner.outcome.kind === "error";

  const clear = () => {
    setInput("");
    setFileName(null);
  };

  return (
    <ToolLayout toolId="json-to-csv" next={[{ to: "csv-to-json", label: "Convert back to JSON", handoff: csv ? { input: csv } : undefined }]}>
      <Toolbar>
        <p className="pl-1 text-[13px] text-ink-3">Nested objects become dotted columns, like address.city.</p>
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={clear} disabled={!input} />
          <RunButton label="Convert" icon={ArrowLeftRight} onClick={runner.run} disabled={!input.trim()} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane
          title="JSON"
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
            label="JSON input"
            value={input}
            onChange={setInput}
            placeholder="Paste an object or an array of objects, or drop a .json file"
            errorLine={error?.line}
            autoFocus={!handoff}
          />
          {error && <ErrorNotice error={error} onFix={error.fix ? () => setInput(error.fix!.apply(input)) : undefined} />}
        </Pane>
        <Pane
          title="CSV"
          actions={
            <>
              <Segmented
                label="Output view"
                value={view}
                onChange={setView}
                options={[
                  { value: "table", label: "Table" },
                  { value: "csv", label: "CSV" },
                ]}
              />
              <CopyButton text={csv} shortcut />
              <DownloadButton content={csv} filename="data.csv" mimeType="text/csv" />
            </>
          }
        >
          {result ? (
            view === "table" ? (
              <DataTable result={result} dimmed={dimmed} />
            ) : (
              <CodeView code={csv} language="text" label="CSV output" dimmed={dimmed} />
            )
          ) : (
            <EmptyState icon={Sheet} title="Drop a .json file or paste into JSON">
              Columns are detected from your keys. The table shows up here as you type.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar
        kind={status.kind}
        label={status.label}
        items={runner.outcome.kind === "ok" && result ? [plural(result.rows.length, "row"), plural(result.headers.length, "column")] : []}
      />
    </ToolLayout>
  );
};

export default JsonToCsv;
