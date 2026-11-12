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
import { toCsv } from "@/lib/csv";
import { flattenNestedObject } from "@/lib/flattenNestedObject";
import { useHandoff } from "@/lib/handoff";
import { plural } from "@/lib/text";
import { parseJson } from "@/lib/toolError";

interface CsvResult {
  headers: string[];
  rows: string[][];
  csv: string;
}

type View = "table" | "csv";

const PREVIEW_ROWS = 100;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

const toCell = (value: unknown): string => {
  if (value === undefined || value === null) return "";
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
};

const convert = (text: string): CsvResult => {
  const parsed = parseJson(text);
  const items = Array.isArray(parsed) ? parsed : [parsed];
  if (items.length === 0 || !items.every(isPlainObject)) {
    throw new Error("JSON must be an object or a non-empty array of objects.");
  }
  const flattened = items.map((item) => flattenNestedObject(item));
  const headers = Array.from(new Set(flattened.flatMap((item) => Object.keys(item))));
  const rows = flattened.map((item) => headers.map((header) => toCell(item[header])));
  return { headers, rows, csv: toCsv(headers, rows) };
};

const DataTable = ({ result, dimmed }: { result: CsvResult; dimmed: boolean }) => (
  <div className={`h-full overflow-auto transition-opacity duration-200 ${dimmed ? "opacity-45" : ""}`}>
    <table className="w-max min-w-full border-separate border-spacing-0 text-left text-[13px]">
      <thead>
        <tr>
          <th className="sticky left-0 top-0 z-20 border-b border-r border-line bg-gutter px-3 py-2 text-right font-mono text-[12px] font-normal text-ink-4">#</th>
          {result.headers.map((header) => (
            <th key={header} className="sticky top-0 z-10 whitespace-nowrap border-b border-line bg-gutter px-3 py-2 font-mono text-[12px] font-medium text-ink">
              {header}
            </th>
          ))}
        </tr>
      </thead>
      <tbody>
        {result.rows.slice(0, PREVIEW_ROWS).map((row, rowIndex) => (
          <tr key={rowIndex} className="hover:bg-sunken/50">
            <td className="sticky left-0 border-r border-line bg-gutter px-3 py-2 text-right font-mono text-[12px] text-ink-4">{rowIndex + 1}</td>
            {row.map((cell, cellIndex) => (
              <td key={cellIndex} className="max-w-[320px] truncate whitespace-nowrap border-b border-line/70 px-3 py-2 text-ink-2" title={cell}>
                {cell}
              </td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
    {result.rows.length > PREVIEW_ROWS && (
      <p className="px-4 py-3 text-[12px] text-ink-3">
        Showing the first {PREVIEW_ROWS} of {result.rows.length.toLocaleString()} rows. Copy or download to get all of them.
      </p>
    )}
  </div>
);

const JsonToCsv = () => {
  const handoff = useHandoff();
  const [input, setInput] = React.useState(handoff?.input ?? "");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [view, setView] = React.useState<View>("table");

  const runner = useToolRunner(input, convert, []);
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
