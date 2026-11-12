import React from "react";
import { ArrowLeftRight, FileCode2 } from "lucide-react";
import X2JS from "x2js";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, DownloadButton, OpenFileButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton, RunButton } from "@/components/workspace/run";
import { outputOf, statusFor } from "@/components/workspace/status";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useFileLoader } from "@/hooks/use-file-loader";
import { useShortcut } from "@/hooks/use-shortcut";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { formatXml } from "@/lib/formatXml";
import { useHandoff } from "@/lib/handoff";
import { byteLength, countLines, formatBytes, plural } from "@/lib/text";
import { parseJson } from "@/lib/toolError";

const convert = (text: string) => {
  const value = parseJson(text);
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new Error('JSON must be an object, for example {"root": {...}}.');
  }
  // XML needs exactly one root element. Several top-level keys, or a single key
  // holding an array, would produce several sibling roots, so wrap them.
  const keys = Object.keys(value);
  const hasSingleRoot = keys.length === 1 && !Array.isArray((value as Record<string, unknown>)[keys[0]]);
  return formatXml(new X2JS().js2xml(hasSingleRoot ? value : { root: value }));
};

const JsonToXml = () => {
  const handoff = useHandoff();
  const [input, setInput] = React.useState(handoff?.input ?? "");
  const [fileName, setFileName] = React.useState<string | null>(null);

  const runner = useToolRunner(input, convert, []);
  useShortcut({ key: "Enter", mod: true }, runner.run);

  const files = useFileLoader({
    extensions: [".json"],
    onLoad: (text, file) => {
      setInput(text);
      setFileName(file.name);
    },
  });

  const output = outputOf(runner) ?? "";
  const status = statusFor(runner, { ok: "Converted", error: "Could not convert", runLabel: "Convert" });
  const error = runner.visibleError;
  const stats = React.useMemo(() => (output ? [plural(countLines(output), "line"), formatBytes(byteLength(output))] : []), [output]);

  const clear = () => {
    setInput("");
    setFileName(null);
  };

  return (
    <ToolLayout toolId="json-to-xml" next={[{ to: "xml-to-json", label: "Convert back to JSON", handoff: output ? { input: output } : undefined }]}>
      <Toolbar>
        <p className="pl-1 text-[13px] text-ink-3">Wrap your data in a single top-level key to name the root element, otherwise it goes inside &lt;root&gt;.</p>
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
            placeholder={'Paste a JSON object, e.g. {"order": {"id": 7}}'}
            errorLine={error?.line}
            autoFocus={!handoff}
          />
          {error && <ErrorNotice error={error} onFix={error.fix ? () => setInput(error.fix!.apply(input)) : undefined} />}
        </Pane>
        <Pane
          title="XML"
          actions={
            <>
              <CopyButton text={output} shortcut />
              <DownloadButton content={output} filename="data.xml" mimeType="application/xml" />
            </>
          }
        >
          {output ? (
            <CodeView code={output} language="xml" label="XML output" dimmed={runner.outcome.kind === "error"} />
          ) : (
            <EmptyState icon={FileCode2} title="Drop a .json file or paste into JSON">
              The XML shows up here as you type.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar kind={status.kind} label={status.label} items={runner.outcome.kind === "ok" ? stats : []} />
    </ToolLayout>
  );
};

export default JsonToXml;
