import React from "react";
import { Info, Regex, TimerOff } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { CodeView } from "@/components/workspace/CodeView";
import { Combobox } from "@/components/workspace/Combobox";
import { HighlightEditor, type HighlightRange } from "@/components/workspace/HighlightEditor";
import { Segmented } from "@/components/workspace/controls";
import { EmptyState } from "@/components/workspace/Feedback";
import { CopyButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton } from "@/components/workspace/run";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useRegex } from "@/hooks/use-regex";
import { MAX_MATCHES, normaliseFlags, REGEX_TIMEOUT_MS, type RegexFlag } from "@/lib/regex";
import { REGEX_PRESETS } from "@/lib/regexPresets";
import { plural } from "@/lib/text";
import { FlagToggles } from "./FlagToggles";
import { MatchList } from "./MatchList";

type View = "matches" | "replace";

const VIEW_OPTIONS: { value: View; label: string }[] = [
  { value: "matches", label: "Matches" },
  { value: "replace", label: "Replace" },
];

const PRESET_OPTIONS = REGEX_PRESETS.map((preset) => ({ value: preset.id, label: preset.label, hint: preset.group, keywords: preset.description }));

const RegexTester = () => {
  const [pattern, setPattern] = React.useState("");
  const [flags, setFlags] = React.useState("g");
  const [text, setText] = React.useState("");
  const [view, setView] = React.useState<View>("matches");
  const [replacement, setReplacement] = React.useState("");
  const [active, setActive] = React.useState<number | null>(null);

  const state = useRegex(pattern, flags, text, view === "replace" ? replacement : undefined);
  const result = state.kind === "done" ? state.result : null;
  const matches = React.useMemo(() => result?.matches ?? [], [result]);

  React.useEffect(() => setActive(null), [matches]);

  const ranges = React.useMemo<HighlightRange[]>(
    () => matches.map((match, index) => ({ start: match.index, end: match.end, tone: (index % 2) as 0 | 1, active: index === active })),
    [matches, active]
  );

  const toggleFlag = (flag: RegexFlag) => {
    const next = flags.includes(flag) ? flags.replace(flag, "") : flag === "u" ? flags.replace("v", "") + flag : flag === "v" ? flags.replace("u", "") + flag : flags + flag;
    setFlags(normaliseFlags(next));
  };

  // The preset in use, as long as its pattern and flags are unchanged.
  const preset = REGEX_PRESETS.find((item) => item.pattern === pattern && normaliseFlags(item.flags) === flags);

  const loadPreset = (id: string) => {
    const chosen = REGEX_PRESETS.find((item) => item.id === id);
    if (!chosen) return;
    setPattern(chosen.pattern);
    setFlags(normaliseFlags(chosen.flags));
    setText(chosen.sample);
    setReplacement(chosen.replacement ?? "");
  };

  const clear = () => {
    setPattern("");
    setText("");
    setReplacement("");
  };

  const groupCount = matches[0]?.groups.length ?? 0;
  const status =
    state.kind === "invalid"
      ? { kind: "error" as const, label: "Invalid pattern" }
      : state.kind === "timeout"
        ? { kind: "error" as const, label: `Stopped after ${REGEX_TIMEOUT_MS / 1000} s` }
        : state.kind === "error"
          ? { kind: "error" as const, label: "Could not run" }
          : state.kind === "running"
            ? { kind: "working" as const, label: "Matching" }
            : result
              ? { kind: "ok" as const, label: plural(matches.length, "match", "matches") }
              : { kind: "idle" as const, label: "Waiting for a pattern" };

  const problem =
    state.kind === "invalid"
      ? state.message
      : state.kind === "timeout"
        ? `The pattern ran for over ${REGEX_TIMEOUT_MS / 1000} seconds and was stopped. Nested quantifiers such as (a+)+ can take exponential time (catastrophic backtracking).`
        : state.kind === "error"
          ? state.message
          : null;

  return (
    <ToolLayout toolId="regex">
      <Toolbar>
        <div className="flex min-w-[16rem] flex-1 items-center rounded-lg border border-line-strong bg-surface focus-within:border-brand/60 focus-within:ring-2 focus-within:ring-brand/20">
          <span aria-hidden="true" className="pl-2.5 font-mono text-[15px] text-ink-4">
            /
          </span>
          <input
            aria-label="Regular expression"
            value={pattern}
            onChange={(event) => setPattern(event.target.value)}
            placeholder="[A-Z]\w+"
            spellCheck={false}
            autoComplete="off"
            autoFocus
            aria-invalid={state.kind === "invalid"}
            className="h-9 min-w-0 flex-1 bg-transparent px-1 font-mono text-[14px] text-ink outline-none placeholder:text-ink-4 aria-[invalid=true]:text-destructive"
          />
          <span aria-hidden="true" className="pr-2.5 font-mono text-[15px] text-ink-4">
            /<span className="text-ink-2">{flags}</span>
          </span>
        </div>
        <FlagToggles flags={flags} onToggle={toggleFlag} />
        <ToolbarSpacer />
        <ToolbarGroup>
          <Combobox
            id="regex-preset"
            label="Common patterns"
            value={preset?.id ?? ""}
            options={PRESET_OPTIONS}
            onChange={loadPreset}
            placeholder="Common patterns…"
            emptyText="No pattern matches"
            className="w-56"
          />
          <ClearButton onClick={clear} disabled={!pattern && !text} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane title="Test text" meta={text ? plural(text.length, "character") : null} actions={<PasteButton onPaste={setText} />}>
          <HighlightEditor label="Test text" value={text} onChange={setText} ranges={ranges} placeholder="Type or paste text to test the pattern against" />
        </Pane>

        <Pane
          title={view === "matches" ? "Matches" : "Replace"}
          actions={
            <>
              <Segmented label="Result view" value={view} options={VIEW_OPTIONS} onChange={setView} />
              {view === "replace" && <CopyButton text={result?.replaced ?? ""} shortcut />}
            </>
          }
        >
          <div className="flex h-full flex-col">
            {problem && (
              <p role="alert" className="flex shrink-0 items-start gap-2 border-b border-line bg-destructive/[0.04] px-4 py-2.5 text-[13px] text-destructive">
                {state.kind === "timeout" && <TimerOff className="mt-0.5 h-4 w-4 shrink-0" />}
                {problem}
              </p>
            )}
            {preset && (
              <p className="flex shrink-0 items-start gap-2 border-b border-line bg-gutter px-4 py-2.5 text-[12px] leading-5 text-ink-2">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-ink-3" />
                <span>
                  <span className="font-medium text-ink">{preset.label}.</span> {preset.description}
                  {preset.flags.includes("m") && " Each line of the test text is checked on its own."}
                </span>
              </p>
            )}
            {view === "replace" && (
              <div className="flex shrink-0 items-center gap-2 border-b border-line py-1.5 pl-4 pr-2">
                <label htmlFor="regex-replacement" className="font-mono text-[12px] text-ink-3">
                  With
                </label>
                <input
                  id="regex-replacement"
                  value={replacement}
                  onChange={(event) => setReplacement(event.target.value)}
                  placeholder="$1, $<name>, $& for the whole match"
                  spellCheck={false}
                  autoComplete="off"
                  className="h-7 min-w-0 flex-1 rounded-md bg-transparent px-1.5 font-mono text-[13px] text-ink outline-none placeholder:font-sans placeholder:text-ink-4 focus-visible:ring-2 focus-visible:ring-brand/30"
                />
              </div>
            )}
            <div className="relative min-h-0 flex-1 overflow-auto">
              {view === "replace" ? (
                result?.replaced !== undefined && text ? (
                  <CodeView code={result.replaced} language="text" label="Replaced text" wrap />
                ) : (
                  <EmptyState icon={Regex} title="Add a pattern and test text">
                    The text with every match replaced shows up here.
                  </EmptyState>
                )
              ) : matches.length ? (
                <MatchList matches={matches} active={active} onSelect={(index) => setActive((current) => (current === index ? null : index))} />
              ) : (
                <EmptyState icon={Regex} title={pattern && text && result ? "No matches" : "Add a pattern and test text"}>
                  {pattern && text && result ? "Check the flags, or pick one of the common patterns to see how it works." : "Matches are highlighted in the text and listed here with their groups. Pick a common pattern to start."}
                </EmptyState>
              )}
            </div>
          </div>
        </Pane>
      </Panes>

      <StatusBar
        kind={status.kind}
        label={status.label}
        items={result ? [`/${flags || "–"}`, groupCount ? plural(groupCount, "group") : null, result.truncated ? `First ${MAX_MATCHES.toLocaleString()} shown` : null, "JavaScript engine"] : []}
      />
    </ToolLayout>
  );
};

export default RegexTester;
