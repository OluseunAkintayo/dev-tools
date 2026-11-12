import React from "react";
import { Clock } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { Button } from "@/components/ui/button";
import { Combobox } from "@/components/workspace/Combobox";
import { CopyRow } from "@/components/workspace/CopyRow";
import { Segmented } from "@/components/workspace/controls";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton } from "@/components/workspace/run";
import { outputOf, statusFor } from "@/components/workspace/status";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarLabel, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useNow } from "@/hooks/use-now";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { useHandoff } from "@/lib/handoff";
import { localTimeZone, parseTimestamp, timeFormats, timeZoneLabel, timeZoneOptions, toDateTimeLocal, type TimestampUnit } from "@/lib/time";

const UNIT_OPTIONS: { value: TimestampUnit; label: string }[] = [
  { value: "auto", label: "Auto" },
  { value: "s", label: "s" },
  { value: "ms", label: "ms" },
  { value: "us", label: "µs" },
  { value: "ns", label: "ns" },
];

const fieldClass =
  "w-full rounded-lg border border-line-strong bg-surface px-3 font-mono text-ink outline-none placeholder:font-sans placeholder:text-ink-4 focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/20";

const TimestampConverter = () => {
  const handoff = useHandoff();
  const [input, setInput] = React.useState(handoff?.input ?? "");
  const [unit, setUnit] = React.useState<TimestampUnit>("auto");
  const [timeZone, setTimeZone] = React.useState(localTimeZone);
  // Offsets are taken once on load; they only change at DST transitions.
  const zones = React.useMemo(() => timeZoneOptions(), []);
  const now = useNow();

  const runner = useToolRunner(input, (text) => parseTimestamp(text, unit, timeZone), [unit, timeZone]);
  const parsed = outputOf(runner);
  // Recomputed every tick so "Relative" stays current.
  const formats = React.useMemo(() => (parsed ? timeFormats(parsed.ms, timeZone, now) : []), [parsed, timeZone, now]);
  const status = statusFor(runner, { ok: "Converted", error: "Could not read the input", runLabel: "Convert", idle: "Waiting for a timestamp or date" });
  const error = runner.visibleError;
  const dimmed = runner.outcome.kind === "error";
  const allFormats = formats.map((format) => `${format.label}: ${format.value}`).join("\n");

  return (
    <ToolLayout toolId="timestamp">
      <Toolbar>
        <ToolbarGroup>
          <ToolbarLabel>Unit</ToolbarLabel>
          <Segmented label="Timestamp unit" value={unit} options={UNIT_OPTIONS} onChange={setUnit} />
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarLabel htmlFor="ts-zone">Time zone</ToolbarLabel>
          <Combobox id="ts-zone" label="Time zone" value={timeZone} options={zones} onChange={setTimeZone} emptyText="No time zone matches" className="w-60" />
        </ToolbarGroup>
        <ToolbarSpacer />
        <ToolbarGroup>
          <Button type="button" variant="ghost" size="sm" onClick={() => setInput(String(Math.floor(Date.now() / 1000)))}>
            Use now
          </Button>
          <ClearButton onClick={() => setInput("")} disabled={!input} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane title="Input" actions={<PasteButton onPaste={(text) => setInput(text.trim())} />}>
          <div className="flex h-full flex-col">
            <div className="space-y-5 p-4">
              <div>
                <label htmlFor="ts-input" className="text-[13px] font-medium text-ink">
                  Timestamp or date
                </label>
                <input
                  id="ts-input"
                  type="text"
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  placeholder="1767225600, 2026-11-12T09:30:00Z or now"
                  spellCheck={false}
                  autoComplete="off"
                  autoFocus={!handoff}
                  aria-invalid={Boolean(error)}
                  aria-describedby="ts-note"
                  className={`${fieldClass} mt-1.5 h-11 text-[15px]`}
                />
                <p id="ts-note" className="mt-1.5 min-h-5 text-[12px] text-ink-3">
                  {parsed?.note ?? "Unix seconds, milliseconds, microseconds or nanoseconds, an ISO 8601 date, or now."}
                </p>
              </div>

              <div>
                <label htmlFor="ts-picker" className="text-[13px] font-medium text-ink">
                  Or pick a date and time
                </label>
                <input
                  id="ts-picker"
                  type="datetime-local"
                  step={1}
                  value={parsed ? toDateTimeLocal(parsed.ms, timeZone) : ""}
                  onChange={(event) => event.target.value && setInput(event.target.value)}
                  className={`${fieldClass} mt-1.5 h-10 text-[14px]`}
                />
                <p className="mt-1.5 text-[12px] text-ink-3">Read as {timeZoneLabel(timeZone)} time.</p>
              </div>
            </div>

            <div className="mt-auto border-t border-line bg-gutter px-4 py-3">
              <p className="text-[12px] text-ink-3">Current Unix time</p>
              <p className="mt-1 font-mono text-[18px] tabular-nums text-ink" aria-live="off">
                {Math.floor(now / 1000)}
              </p>
            </div>
            {error && <ErrorNotice error={error} />}
          </div>
        </Pane>

        <Pane title="Formats" actions={<CopyButton text={allFormats} shortcut />}>
          {formats.length ? (
            <div className="h-full overflow-auto">
              <dl>
                {formats.map((format) => (
                  <CopyRow key={format.id} label={format.label} value={format.value} dimmed={dimmed} />
                ))}
              </dl>
            </div>
          ) : (
            <EmptyState icon={Clock} title="Type a timestamp or a date">
              Every format shows up here, each with its own copy button.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar kind={status.kind} label={status.label} items={runner.outcome.kind === "ok" && parsed ? [parsed.kind === "date" ? "Date" : parsed.kind === "now" ? "Now" : `Unix ${parsed.kind}`, timeZoneLabel(timeZone)] : []} />
    </ToolLayout>
  );
};

export default TimestampConverter;
