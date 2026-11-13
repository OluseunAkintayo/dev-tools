import { Braces, Info, TriangleAlert } from "lucide-react";
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
import { usePersistentState } from "@/hooks/use-persistent-state";
import { useShortcut } from "@/hooks/use-shortcut";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { CASE_LABELS, generateCode, LANGUAGE_IDS, LANGUAGES, type LanguageId, type NamingStyle } from "@/lib/codegen";
import { useHandoff } from "@/lib/handoff";
import { countLines, plural } from "@/lib/text";
import { parseJson } from "@/lib/toolError";

const DEFAULT_NAME = "Root";

const LANGUAGE_OPTIONS = LANGUAGE_IDS.map((id) => ({ value: id, label: LANGUAGES[id].label }));

const NAMING_OPTIONS: { value: NamingStyle; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "camel", label: CASE_LABELS.camel },
  { value: "pascal", label: CASE_LABELS.pascal },
  { value: "snake", label: CASE_LABELS.snake },
  { value: "keep", label: "Keep" },
];

const CLASS_OPTIONS = [
  { value: "class" as const, label: "class" },
  { value: "record" as const, label: "record" },
];

const JsonToCode = () => {
  const handoff = useHandoff();
  const [input, setInput] = usePersistentState("json-to-code", "input", handoff?.input ?? "");
  const [fileName, setFileName] = usePersistentState<string | null>("json-to-code", "fileName", null);
  const [name, setName] = usePersistentState("json-to-code", "name", DEFAULT_NAME);
  const [language, setLanguage] = usePersistentState<LanguageId>("json-to-code", "language", "typescript");
  const [naming, setNaming] = usePersistentState<NamingStyle>("json-to-code", "naming", "auto");
  const [integers, setIntegers] = usePersistentState("json-to-code", "integers", true);
  const [mapper, setMapper] = usePersistentState("json-to-code", "mapper", true);
  const [csharpKind, setCsharpKind] = usePersistentState<"class" | "record">("json-to-code", "csharpKind", "class");
  const [javaKind, setJavaKind] = usePersistentState<"class" | "record">("json-to-code", "javaKind", "record");

  const spec = LANGUAGES[language];

  const runner = useToolRunner(
    input,
    (text) => generateCode(parseJson(text), { language, name: name || DEFAULT_NAME, naming, integers, mapper, csharpKind, javaKind }),
    [language, name, naming, integers, mapper, csharpKind, javaKind]
  );
  useShortcut({ key: "Enter", mod: true }, runner.run);

  const files = useFileLoader({
    extensions: [".json"],
    onLoad: (text, file) => {
      setInput(text);
      setFileName(file.name);
    },
  });

  const result = outputOf(runner);
  const code = result?.code ?? "";
  const status = statusFor(runner, { ok: "Generated", error: "Could not generate", runLabel: "Generate" });
  const error = runner.visibleError;
  const messages = [...(result?.warnings.map((text) => ({ text, warning: true })) ?? []), ...(result?.notes.map((text) => ({ text, warning: false })) ?? [])];
  const autoLabel = spec.rules.autoStyle === "keep" ? "keeps names that are already valid" : CASE_LABELS[spec.rules.autoStyle];

  const clear = () => {
    setInput("");
    setFileName(null);
  };

  return (
    <ToolLayout toolId="json-to-code" next={[{ to: "json-to-zod", label: "Generate a Zod schema instead", handoff: input.trim() ? { input } : undefined }]}>
      <Toolbar>
        <ToolbarGroup>
          <ToolbarLabel htmlFor="code-name">Name</ToolbarLabel>
          <input
            id="code-name"
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder={DEFAULT_NAME}
            spellCheck={false}
            className="h-8 w-32 rounded-lg border border-line-strong bg-surface px-2.5 font-mono text-[13px] text-ink outline-none placeholder:text-ink-3 focus:border-brand/60 focus:ring-2 focus:ring-brand/20"
          />
        </ToolbarGroup>
        <Segmented label="Language" value={language} options={LANGUAGE_OPTIONS} onChange={setLanguage} />
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={clear} disabled={!input} />
          <RunButton label="Generate" icon={Braces} onClick={runner.run} disabled={!input.trim()} />
        </ToolbarGroup>
      </Toolbar>
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-x border-b border-line bg-surface px-3 py-2">
        <ToolbarGroup>
          <ToolbarLabel>Field names</ToolbarLabel>
          <Segmented label="Field naming" value={naming} options={NAMING_OPTIONS} onChange={setNaming} />
          {naming === "auto" && <span className="text-[12px] text-ink-3">{autoLabel}</span>}
        </ToolbarGroup>
        {language === "csharp" && <Segmented label="C# type" value={csharpKind} options={CLASS_OPTIONS} onChange={setCsharpKind} />}
        {language === "java" && <Segmented label="Java type" value={javaKind} options={CLASS_OPTIONS} onChange={setJavaKind} />}
        {language === "typescript" && <Switch label="JSON mapper" checked={mapper} onChange={setMapper} />}
        <Switch label="Detect integers" checked={integers} onChange={setIntegers} />
      </div>

      <Panes className="border-t-0">
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
          title={spec.label}
          meta={spec.library}
          actions={
            <>
              <CopyButton text={code} shortcut />
              <DownloadButton content={code} filename={spec.fileName(result?.typeName ?? DEFAULT_NAME)} mimeType="text/plain" />
            </>
          }
        >
          {code ? (
            <div className="flex h-full flex-col">
              {messages.length > 0 && (
                <ul role="status" className="shrink-0 space-y-1 border-b border-line bg-gutter px-4 py-2.5 text-[12px] leading-5">
                  {messages.map(({ text, warning }) => {
                    const Icon = warning ? TriangleAlert : Info;
                    return (
                      <li key={text} className={`flex items-start gap-2 ${warning ? "text-warn" : "text-ink-3"}`}>
                        <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                        {text}
                      </li>
                    );
                  })}
                </ul>
              )}
              <div className="relative min-h-0 flex-1">
                <CodeView code={code} language={spec.highlight} label={`${spec.label} output`} dimmed={runner.outcome.kind === "error"} />
              </div>
            </div>
          ) : (
            <EmptyState icon={Braces} title="Paste a JSON sample into JSON">
              Pick a language. Types come from every item in an array, and keys with spaces are renamed while the JSON keys are kept.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar
        kind={status.kind}
        label={status.label}
        items={runner.outcome.kind === "ok" && result ? [result.typeName, plural(result.typeCount, "type"), plural(countLines(code), "line")] : []}
      />
    </ToolLayout>
  );
};

export default JsonToCode;
