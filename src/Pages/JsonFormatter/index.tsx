import React from "react";
import { ChevronsDownUp, ChevronsUpDown, FileJson, SearchX, WandSparkles, X } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CodeView } from "@/components/workspace/CodeView";
import { JsonTree } from "@/components/workspace/JsonTree";
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
import { useHandoff } from "@/lib/handoff";
import { queryJsonPath } from "@/lib/jsonPath";
import { sortKeysDeep, stringifyJson } from "@/lib/json";
import { byteLength, countLines, formatBytes, plural } from "@/lib/text";
import { parseJson, toToolError } from "@/lib/toolError";

type Indent = "2" | "4" | "tab" | "min";
type View = "code" | "tree";

const INDENT_OPTIONS: { value: Indent; label: string }[] = [
  { value: "2", label: "2 spaces" },
  { value: "4", label: "4 spaces" },
  { value: "tab", label: "Tab" },
  { value: "min", label: "Minify" },
];

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "code", label: "Code" },
  { value: "tree", label: "Tree" },
];

/** Tree depth that starts expanded by default, and the values used by Expand all / Collapse all. */
const DEFAULT_EXPAND = 2;
const EXPAND_ALL = Number.POSITIVE_INFINITY;
const COLLAPSE_ALL = 1;

type QueryOutcome = { kind: "none" } | { kind: "ok"; matches: unknown[] } | { kind: "error"; message: string };

const JsonFormatter = () => {
  const handoff = useHandoff();
  const [input, setInput] = usePersistentState("json-formatter", "input", handoff?.input ?? "");
  const [fileName, setFileName] = usePersistentState<string | null>("json-formatter", "fileName", null);
  const [indent, setIndent] = usePersistentState<Indent>("json-formatter", "indent", "2");
  const [sortKeys, setSortKeys] = usePersistentState("json-formatter", "sortKeys", false);
  const [view, setView] = usePersistentState<View>("json-formatter", "view", "code");
  const [query, setQuery] = usePersistentState("json-formatter", "query", "");
  const [tree, setTree] = React.useState({ depth: DEFAULT_EXPAND, version: 0 });
  const deferredQuery = React.useDeferredValue(query.trim());

  const runner = useToolRunner(
    input,
    (text) => {
      const data = parseJson(text);
      return sortKeys ? sortKeysDeep(data) : data;
    },
    [sortKeys]
  );
  useShortcut({ key: "Enter", mod: true }, runner.run);

  const files = useFileLoader({
    extensions: [".json"],
    onLoad: (text, file) => {
      setInput(text);
      setFileName(file.name);
    },
  });

  const data = outputOf(runner);
  const hasData = runner.outcome.kind === "ok" || runner.lastValue !== null;

  const queryOutcome = React.useMemo<QueryOutcome>(() => {
    if (!deferredQuery || deferredQuery === "$" || !hasData) return { kind: "none" };
    try {
      return { kind: "ok", matches: queryJsonPath(data, deferredQuery) };
    } catch (err) {
      return { kind: "error", message: toToolError(err).message };
    }
  }, [data, hasData, deferredQuery]);

  const shown = queryOutcome.kind === "ok" ? queryOutcome.matches : data;
  const output = React.useMemo(() => (hasData ? stringifyJson(shown, indent) : ""), [hasData, shown, indent]);

  const baseStatus = statusFor(runner, { ok: "Valid JSON", error: "Invalid JSON", runLabel: "Format" });
  const status = runner.outcome.kind === "ok" && queryOutcome.kind === "error" ? { kind: "error" as const, label: "Invalid query" } : baseStatus;
  const indentLabel = indent === "min" ? "Minified" : INDENT_OPTIONS.find((option) => option.value === indent)?.label;
  const outputStats = React.useMemo(() => (output ? [plural(countLines(output), "line"), formatBytes(byteLength(output))] : []), [output]);
  const matchLabel = queryOutcome.kind === "ok" ? plural(queryOutcome.matches.length, "match") : null;
  const error = runner.visibleError;
  const dimmed = runner.outcome.kind === "error" || queryOutcome.kind === "error";
  const noMatches = queryOutcome.kind === "ok" && queryOutcome.matches.length === 0;

  const clear = () => {
    setInput("");
    setFileName(null);
  };

  const expandTree = (depth: number) => setTree((current) => ({ depth, version: current.version + 1 }));

  return (
    <ToolLayout
      toolId="json-formatter"
      next={[
        { to: "json-to-code", label: "Generate code from this", handoff: output ? { input: output } : undefined },
        { to: "json-to-csv", label: "Convert to CSV", handoff: output ? { input: output } : undefined },
        { to: "json-to-xml", label: "Convert to XML", handoff: output ? { input: output } : undefined },
      ]}
    >
      <Toolbar>
        <ToolbarGroup>
          <ToolbarLabel>Indent</ToolbarLabel>
          <Segmented label="Indentation" value={indent} options={INDENT_OPTIONS} onChange={setIndent} />
        </ToolbarGroup>
        <Switch label="Sort keys" checked={sortKeys} onChange={setSortKeys} />
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={clear} disabled={!input} />
          <RunButton label="Format" icon={WandSparkles} onClick={runner.run} disabled={!input.trim()} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane
          title="Input"
          titleId="json-input-title"
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
            id="json-input"
            label="JSON input"
            value={input}
            onChange={setInput}
            placeholder="Paste JSON here, or drop a .json file"
            errorLine={error?.line}
            autoFocus={!handoff}
          />
          {error && <ErrorNotice error={error} onFix={error.fix ? () => setInput(error.fix!.apply(input)) : undefined} />}
        </Pane>

        <Pane
          title="Output"
          meta={matchLabel}
          actions={
            <>
              <Segmented label="Output view" value={view} options={VIEW_OPTIONS} onChange={setView} />
              <CopyButton text={output} shortcut />
              <DownloadButton content={output} filename={queryOutcome.kind === "ok" ? "query-result.json" : "formatted.json"} mimeType="application/json" />
            </>
          }
        >
          <div className="flex h-full flex-col">
            <div className="flex h-10 shrink-0 items-center gap-2 border-b border-line pl-4 pr-2">
              <label htmlFor="json-query" className="font-mono text-[12px] text-ink-3">
                Query
              </label>
              <input
                id="json-query"
                type="text"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="$.items[*].name"
                spellCheck={false}
                autoComplete="off"
                aria-invalid={queryOutcome.kind === "error"}
                aria-describedby={queryOutcome.kind === "error" ? "json-query-error" : undefined}
                className="h-7 min-w-0 flex-1 rounded-md bg-transparent px-1.5 font-mono text-[13px] text-ink outline-none placeholder:text-ink-4 focus-visible:ring-2 focus-visible:ring-brand/30 aria-[invalid=true]:text-destructive"
              />
              {query && (
                <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Clear query" onClick={() => setQuery("")}>
                  <X />
                </Button>
              )}
              {view === "tree" && hasData && (
                <>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Expand all" onClick={() => expandTree(EXPAND_ALL)}>
                        <ChevronsUpDown />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Expand all</TooltipContent>
                  </Tooltip>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7" aria-label="Collapse all" onClick={() => expandTree(COLLAPSE_ALL)}>
                        <ChevronsDownUp />
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Collapse all</TooltipContent>
                  </Tooltip>
                </>
              )}
            </div>
            {queryOutcome.kind === "error" && (
              <p id="json-query-error" role="alert" className="shrink-0 border-b border-line bg-destructive/[0.04] px-4 py-2 text-[12px] text-destructive">
                {queryOutcome.message}
              </p>
            )}
            <div className="relative min-h-0 flex-1">
              {!hasData ? (
                <EmptyState icon={FileJson} title="Drop a .json file or paste into Input">
                  The result shows up here as you type.
                </EmptyState>
              ) : noMatches ? (
                <EmptyState icon={SearchX} title="No matches">
                  Nothing in the JSON matches this query.
                </EmptyState>
              ) : view === "tree" ? (
                <JsonTree key={tree.version} data={shown} label="JSON tree" expandDepth={tree.depth} dimmed={dimmed} />
              ) : (
                <CodeView code={output} language="json" label="Formatted JSON" wrap={indent === "min"} dimmed={dimmed} />
              )}
            </div>
          </div>
        </Pane>
      </Panes>

      <StatusBar
        kind={status.kind}
        label={status.label}
        items={runner.outcome.kind === "ok" ? [...outputStats, indentLabel, sortKeys && "Keys sorted", matchLabel] : []}
      />
    </ToolLayout>
  );
};

export default JsonFormatter;
