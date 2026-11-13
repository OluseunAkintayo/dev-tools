import { Braces } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, DownloadButton, OpenFileButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton, RunButton } from "@/components/workspace/run";
import { outputOf, statusFor } from "@/components/workspace/status";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarLabel, ToolbarSpacer } from "@/components/workspace/Workspace";
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useFileLoader } from "@/hooks/use-file-loader";
import { useShortcut } from "@/hooks/use-shortcut";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { generateInterface, toTypeName } from "@/lib/generateInterface";
import { useHandoff } from "@/lib/handoff";
import { countLines, plural } from "@/lib/text";
import { parseJson } from "@/lib/toolError";

const DEFAULT_NAME = "Root";

const InterfaceGenerator = () => {
  const handoff = useHandoff();
  const [input, setInput] = usePersistentState("json-to-interface", "input", handoff?.input ?? "");
  const [fileName, setFileName] = usePersistentState<string | null>("json-to-interface", "fileName", null);
  const [name, setName] = usePersistentState("json-to-interface", "name", DEFAULT_NAME);

  const runner = useToolRunner(input, (text) => generateInterface(parseJson(text), name || DEFAULT_NAME), [name]);
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
    <ToolLayout toolId="json-to-interface" next={[{ to: "json-to-zod", label: "Generate a Zod schema instead", handoff: input.trim() ? { input } : undefined }]}>
      <Toolbar>
        <ToolbarGroup>
          <ToolbarLabel htmlFor="interface-name">Interface name</ToolbarLabel>
          <input
            id="interface-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={DEFAULT_NAME}
            spellCheck={false}
            className="h-8 w-44 rounded-lg border border-line-strong bg-surface px-2.5 font-mono text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
          />
        </ToolbarGroup>
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={clear} disabled={!input} />
          <RunButton label="Generate" icon={Braces} onClick={runner.run} disabled={!input.trim()} />
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
          title="TypeScript"
          actions={
            <>
              <CopyButton text={output} shortcut />
              <DownloadButton content={output} filename={`${typeName}.ts`} mimeType="text/plain" />
            </>
          }
        >
          {output ? (
            <CodeView code={output} language="ts" label="TypeScript output" dimmed={runner.outcome.kind === "error"} />
          ) : (
            <EmptyState icon={Braces} title="Paste a JSON sample into JSON">
              Types are inferred from the values. Arrays of objects use the first item.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar
        kind={status.kind}
        label={status.label}
        items={runner.outcome.kind === "ok" ? [typeName, plural(countLines(output), "line")] : []}
      />
    </ToolLayout>
  );
};

export default InterfaceGenerator;
