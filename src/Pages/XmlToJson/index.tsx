import React from "react";
import { ArrowLeftRight, FileJson } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, DownloadButton, OpenFileButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton, RunButton } from "@/components/workspace/run";
import { outputOf, statusFor } from "@/components/workspace/status";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarSpacer } from "@/components/workspace/Workspace";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useFileLoader } from "@/hooks/use-file-loader";
import { useShortcut } from "@/hooks/use-shortcut";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { useHandoff } from "@/lib/handoff";
import { byteLength, countLines, formatBytes, plural } from "@/lib/text";
import { xmlToJson } from "@/lib/xml";

const XmlToJson = () => {
  const handoff = useHandoff();
  const [input, setInput] = usePersistentState("xml-to-json", "input", handoff?.input ?? "");
  const [fileName, setFileName] = usePersistentState<string | null>("xml-to-json", "fileName", null);

  const runner = useToolRunner(input, xmlToJson, []);
  useShortcut({ key: "Enter", mod: true }, runner.run);

  const files = useFileLoader({
    extensions: [".xml"],
    onLoad: (text, file) => {
      setInput(text);
      setFileName(file.name);
    },
  });

  const output = outputOf(runner) ?? "";
  const status = statusFor(runner, { ok: "Converted", error: "Invalid XML", runLabel: "Convert" });
  const error = runner.visibleError;
  const stats = React.useMemo(() => (output ? [plural(countLines(output), "line"), formatBytes(byteLength(output))] : []), [output]);

  const clear = () => {
    setInput("");
    setFileName(null);
  };

  return (
    <ToolLayout
      toolId="xml-to-json"
      next={[
        { to: "json-to-interface", label: "Generate interface from this", handoff: output ? { input: output } : undefined },
        { to: "json-to-csv", label: "Convert to CSV", handoff: output ? { input: output } : undefined },
      ]}
    >
      <Toolbar>
        <p className="pl-1 text-[13px] text-ink-3">Attributes become keys prefixed with an underscore.</p>
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={clear} disabled={!input} />
          <RunButton label="Convert" icon={ArrowLeftRight} onClick={runner.run} disabled={!input.trim()} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane
          title="XML"
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
            label="XML input"
            value={input}
            onChange={setInput}
            placeholder="Paste XML here, or drop a .xml file"
            errorLine={error?.line}
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
            <EmptyState icon={FileJson} title="Drop a .xml file or paste into XML">
              The JSON shows up here as you type.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar kind={status.kind} label={status.label} items={runner.outcome.kind === "ok" ? stats : []} />
    </ToolLayout>
  );
};

export default XmlToJson;
