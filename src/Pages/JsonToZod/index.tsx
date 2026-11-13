import { BadgeCheck } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { Segmented, Switch } from "@/components/workspace/controls";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, DownloadButton, OpenFileButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton, RunButton } from "@/components/workspace/run";
import { outputOf, statusFor } from "@/components/workspace/status";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarLabel, ToolbarSpacer } from "@/components/workspace/Workspace";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useFileLoader } from "@/hooks/use-file-loader";
import { useShortcut } from "@/hooks/use-shortcut";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { generateZod, type ZodVersion } from "@/lib/generateZod";
import { useHandoff } from "@/lib/handoff";
import { toTypeName } from "@/lib/inferShape";
import { countLines, plural } from "@/lib/text";
import { parseJson } from "@/lib/toolError";

const DEFAULT_NAME = "Root";

const VERSION_OPTIONS: { value: ZodVersion; label: string }[] = [
  { value: "4", label: "Zod 4" },
  { value: "3", label: "Zod 3" },
];

const JsonToZod = () => {
  const handoff = useHandoff();
  const [input, setInput] = usePersistentState("json-to-zod", "input", handoff?.input ?? "");
  const [fileName, setFileName] = usePersistentState<string | null>("json-to-zod", "fileName", null);
  const [name, setName] = usePersistentState("json-to-zod", "name", DEFAULT_NAME);
  const [version, setVersion] = usePersistentState<ZodVersion>("json-to-zod", "version", "4");
  const [strict, setStrict] = usePersistentState("json-to-zod", "strict", false);
  const [formats, setFormats] = usePersistentState("json-to-zod", "formats", true);
  const [inferType, setInferType] = usePersistentState("json-to-zod", "inferType", true);

  const runner = useToolRunner(
    input,
    (text) => generateZod(parseJson(text), { name: name || DEFAULT_NAME, version, strict, formats, inferType }),
    [name, version, strict, formats, inferType]
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
  const status = statusFor(runner, { ok: "Generated", error: "Invalid JSON", runLabel: "Generate" });
  const error = runner.visibleError;
  const typeName = toTypeName(name || DEFAULT_NAME) || DEFAULT_NAME;

  const clear = () => {
    setInput("");
    setFileName(null);
  };

  return (
    <ToolLayout toolId="json-to-zod" next={[{ to: "json-to-code", label: "Generate TypeScript, C#, Java and more", handoff: input.trim() ? { input } : undefined }]}>
      <Toolbar>
        <ToolbarGroup>
          <ToolbarLabel htmlFor="zod-name">Name</ToolbarLabel>
          <input
            id="zod-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={DEFAULT_NAME}
            spellCheck={false}
            className="h-8 w-40 rounded-lg border border-line-strong bg-surface px-2.5 font-mono text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
          />
        </ToolbarGroup>
        <Segmented label="Zod version" value={version} options={VERSION_OPTIONS} onChange={setVersion} />
        <Switch label="Strict objects" checked={strict} onChange={setStrict} />
        <Switch label="Detect formats" checked={formats} onChange={setFormats} />
        <Switch label="Export type" checked={inferType} onChange={setInferType} />
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={clear} disabled={!input} />
          <RunButton label="Generate" icon={BadgeCheck} onClick={runner.run} disabled={!input.trim()} />
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
            placeholder="Paste a JSON sample, e.g. an API response"
            errorLine={error?.line}
            autoFocus={!handoff}
          />
          {error && <ErrorNotice error={error} onFix={error.fix ? () => setInput(error.fix!.apply(input)) : undefined} />}
        </Pane>
        <Pane
          title="Zod schema"
          actions={
            <>
              <CopyButton text={output} shortcut />
              <DownloadButton content={output} filename={`${typeName.charAt(0).toLowerCase()}${typeName.slice(1)}.schema.ts`} mimeType="text/plain" />
            </>
          }
        >
          {output ? (
            <CodeView code={output} language="ts" label="Zod schema output" dimmed={runner.outcome.kind === "error"} />
          ) : (
            <EmptyState icon={BadgeCheck} title="Paste a JSON sample into JSON">
              Every item in an array is merged, so keys missing from some items become optional.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar
        kind={status.kind}
        label={status.label}
        items={runner.outcome.kind === "ok" ? [`${typeName}Schema`, `Zod ${version}`, plural(countLines(output), "line")] : []}
      />
    </ToolLayout>
  );
};

export default JsonToZod;
