import React from "react";
import { ArrowLeftRight, FileCode2 } from "lucide-react";
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
import { jsonToYaml } from "@/lib/yaml";

type Indent = "2" | "4";

const INDENT_OPTIONS: { value: Indent; label: string }[] = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
];

const JsonToYaml = () => {
  const handoff = useHandoff();
  const [input, setInput] = React.useState(handoff?.input ?? "");
  const [fileName, setFileName] = React.useState<string | null>(null);
  const [indent, setIndent] = React.useState<Indent>("2");
  const [sortKeys, setSortKeys] = React.useState(false);

  const runner = useToolRunner(input, (text) => jsonToYaml(text, { indent: indent === "4" ? 4 : 2, sortKeys }), [indent, sortKeys]);
  useShortcut({ key: "Enter", mod: true }, runner.run);

  const files = useFileLoader({
    extensions: [".json"],
    onLoad: (text, file) => {
      setInput(text);
      setFileName(file.name);
    },
  });

  const output = outputOf(runner) ?? "";
  const status = statusFor(runner, { ok: "Converted", error: "Invalid JSON", runLabel: "Convert" });
  const error = runner.visibleError;
  const stats = React.useMemo(() => (output ? [plural(countLines(output), "line"), formatBytes(byteLength(output))] : []), [output]);

  const clear = () => {
    setInput("");
    setFileName(null);
  };

  return (
    <ToolLayout toolId="json-to-yaml" next={[{ to: "yaml-to-json", label: "Convert back to JSON", handoff: output ? { input: output } : undefined }]}>
      <Toolbar>
        <ToolbarGroup>
          <ToolbarLabel>Indent</ToolbarLabel>
          <Segmented label="YAML indentation" value={indent} options={INDENT_OPTIONS} onChange={setIndent} />
        </ToolbarGroup>
        <Switch label="Sort keys" checked={sortKeys} onChange={setSortKeys} />
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
          <CodeEditor label="JSON input" value={input} onChange={setInput} placeholder="Paste JSON here, or drop a .json file" errorLine={error?.line} autoFocus={!handoff} />
          {error && <ErrorNotice error={error} onFix={error.fix ? () => setInput(error.fix!.apply(input)) : undefined} />}
        </Pane>
        <Pane
          title="YAML"
          actions={
            <>
              <CopyButton text={output} shortcut />
              <DownloadButton content={output} filename={fileName ? fileName.replace(/\.json$/i, ".yaml") : "data.yaml"} mimeType="application/yaml" />
            </>
          }
        >
          {output ? (
            <CodeView code={output} language="yaml" label="YAML output" dimmed={runner.outcome.kind === "error"} />
          ) : (
            <EmptyState icon={FileCode2} title="Drop a .json file or paste into JSON">
              The YAML shows up here as you type. Values like "yes" and "on" are quoted so they stay strings.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar kind={status.kind} label={status.label} items={runner.outcome.kind === "ok" ? [...stats, indent === "4" ? "4 spaces" : "2 spaces", sortKeys && "Keys sorted"] : []} />
    </ToolLayout>
  );
};

export default JsonToYaml;
