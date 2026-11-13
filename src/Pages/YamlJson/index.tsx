import React from "react";
import { ArrowLeftRight, FileJson, TriangleAlert } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { Segmented } from "@/components/workspace/controls";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, DownloadButton, OpenFileButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton, RunButton } from "@/components/workspace/run";
import { outputOf, statusFor } from "@/components/workspace/status";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarLabel, ToolbarSpacer } from "@/components/workspace/Workspace";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useFileLoader } from "@/hooks/use-file-loader";
import { useShortcut } from "@/hooks/use-shortcut";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { useHandoff } from "@/lib/handoff";
import type { JsonIndent } from "@/lib/json";
import { byteLength, countLines, formatBytes, plural } from "@/lib/text";
import { yamlToJson } from "@/lib/yaml";

const INDENT_OPTIONS: { value: JsonIndent; label: string }[] = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
  { value: "min", label: "Minify" },
];

const YamlToJson = () => {
  const handoff = useHandoff();
  const [input, setInput] = usePersistentState("yaml-to-json", "input", handoff?.input ?? "");
  const [fileName, setFileName] = usePersistentState<string | null>("yaml-to-json", "fileName", null);
  const [indent, setIndent] = usePersistentState<JsonIndent>("yaml-to-json", "indent", "2");

  const runner = useToolRunner(input, (text) => yamlToJson(text, indent), [indent]);
  useShortcut({ key: "Enter", mod: true }, runner.run);

  const files = useFileLoader({
    extensions: [".yaml", ".yml"],
    onLoad: (text, file) => {
      setInput(text);
      setFileName(file.name);
    },
  });

  const result = outputOf(runner);
  const output = result?.json ?? "";
  const status = statusFor(runner, { ok: "Converted", error: "Invalid YAML", runLabel: "Convert" });
  const error = runner.visibleError;
  const stats = React.useMemo(() => (output ? [plural(countLines(output), "line"), formatBytes(byteLength(output))] : []), [output]);
  const warnings = runner.outcome.kind === "ok" ? runner.outcome.value.warnings : [];

  const clear = () => {
    setInput("");
    setFileName(null);
  };

  return (
    <ToolLayout
      toolId="yaml-to-json"
      next={[
        { to: "json-formatter", label: "Open in JSON Formatter", handoff: output ? { input: output } : undefined },
        { to: "json-to-interface", label: "Generate interface from this", handoff: output ? { input: output } : undefined },
        { to: "json-to-yaml", label: "Convert back to YAML", handoff: output ? { input: output } : undefined },
      ]}
    >
      <Toolbar>
        <ToolbarGroup>
          <ToolbarLabel>Indent</ToolbarLabel>
          <Segmented label="JSON indentation" value={indent} options={INDENT_OPTIONS} onChange={setIndent} />
        </ToolbarGroup>
        <p className="hidden pl-1 text-[13px] text-ink-3 lg:block">Several --- documents become a JSON array.</p>
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={clear} disabled={!input} />
          <RunButton label="Convert" icon={ArrowLeftRight} onClick={runner.run} disabled={!input.trim()} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane
          title="YAML"
          meta={fileName}
          onFileDrop={files.load}
          actions={
            <>
              <PasteButton onPaste={setInput} />
              <OpenFileButton accept={files.accept} onFile={files.load} disabled={files.loading} />
            </>
          }
        >
          <CodeEditor label="YAML input" value={input} onChange={setInput} placeholder="Paste YAML here, or drop a .yaml file" errorLine={error?.line} autoFocus={!handoff} />
          {error && <ErrorNotice error={error} />}
        </Pane>
        <Pane
          title="JSON"
          actions={
            <>
              <CopyButton text={output} shortcut />
              <DownloadButton content={output} filename={fileName ? fileName.replace(/\.ya?ml$/i, ".json") : "data.json"} mimeType="application/json" />
            </>
          }
        >
          {output ? (
            <div className="flex h-full flex-col">
              {warnings.length > 0 && (
                <ul role="status" className="shrink-0 space-y-1 border-b border-line bg-warn/[0.06] px-4 py-2.5 text-[12px] text-warn">
                  {warnings.map((warning) => (
                    <li key={warning} className="flex items-start gap-2">
                      <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
                      {warning}
                    </li>
                  ))}
                </ul>
              )}
              <div className="relative min-h-0 flex-1">
                <CodeView code={output} language="json" label="JSON output" wrap={indent === "min"} dimmed={runner.outcome.kind === "error"} />
              </div>
            </div>
          ) : (
            <EmptyState icon={FileJson} title="Drop a .yaml file or paste into YAML">
              The JSON shows up here as you type. Anchors, aliases and merge keys are expanded.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar
        kind={status.kind}
        label={status.label}
        items={runner.outcome.kind === "ok" && result ? [result.documents > 1 ? `${result.documents} documents` : null, ...stats, "YAML 1.2"] : []}
      />
    </ToolLayout>
  );
};

export default YamlToJson;
