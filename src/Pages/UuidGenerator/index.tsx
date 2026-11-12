import React from "react";
import { IdCard, RefreshCw, ScanSearch } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { Button } from "@/components/ui/button";
import { CodeView } from "@/components/workspace/CodeView";
import { CopyRow } from "@/components/workspace/CopyRow";
import { Segmented, Switch } from "@/components/workspace/controls";
import { EmptyState } from "@/components/workspace/Feedback";
import { CopyButton, DownloadButton } from "@/components/workspace/actions";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarLabel, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useShortcut } from "@/hooks/use-shortcut";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { useHandoff } from "@/lib/handoff";
import { plural } from "@/lib/text";
import { createV7Generator, formatUuid, inspectUuid, uuidV4 } from "@/lib/uuid";

type Version = "v4" | "v7";

const VERSION_OPTIONS: { value: Version; label: string }[] = [
  { value: "v4", label: "v4 random" },
  { value: "v7", label: "v7 time-ordered" },
];

const MAX_COUNT = 1000;

const UuidGenerator = () => {
  const handoff = useHandoff();
  const [version, setVersion] = React.useState<Version>("v7");
  const [countText, setCountText] = React.useState("5");
  const [uppercase, setUppercase] = React.useState(false);
  const [hyphens, setHyphens] = React.useState(true);
  const [braces, setBraces] = React.useState(false);
  const [uuids, setUuids] = React.useState<string[]>([]);
  // A UUID handed over (from Smart Paste) is inspected instead of the first generated one.
  const [inspectInput, setInspectInput] = React.useState(handoff?.input.trim() ?? "");
  const [inspectTouched, setInspectTouched] = React.useState(Boolean(handoff?.input.trim()));
  // One generator for the page, so v7 UUIDs stay in order across batches.
  const v7 = React.useMemo(() => createV7Generator(), []);

  const count = Math.min(Math.max(Math.floor(Number(countText)) || 1, 1), MAX_COUNT);

  const generate = React.useCallback(() => {
    const next = Array.from({ length: count }, version === "v4" ? uuidV4 : v7);
    setUuids(next);
  }, [count, version, v7]);

  React.useEffect(generate, [generate]);
  useShortcut({ key: "Enter", mod: true }, generate);

  // Until the user types their own, inspect the first generated UUID.
  const inspected = inspectTouched ? inspectInput : uuids[0] ?? "";
  const runner = useToolRunner(inspected, inspectUuid, []);
  const info = runner.outcome.kind === "ok" ? runner.outcome.value : null;
  const inspectError = runner.visibleError;

  const output = React.useMemo(() => uuids.map((uuid) => formatUuid(uuid, { uppercase, hyphens, braces })).join("\n"), [uuids, uppercase, hyphens, braces]);

  return (
    <ToolLayout toolId="uuid">
      <Toolbar>
        <ToolbarGroup>
          <ToolbarLabel>Version</ToolbarLabel>
          <Segmented label="UUID version" value={version} options={VERSION_OPTIONS} onChange={setVersion} />
        </ToolbarGroup>
        <ToolbarGroup>
          <ToolbarLabel htmlFor="uuid-count">How many</ToolbarLabel>
          <input
            id="uuid-count"
            type="number"
            min={1}
            max={MAX_COUNT}
            value={countText}
            onChange={(event) => setCountText(event.target.value)}
            onBlur={() => setCountText(String(count))}
            className="h-8 w-20 rounded-lg border border-line-strong bg-surface px-2 font-mono text-[13px] text-ink outline-none focus-visible:border-brand/60 focus-visible:ring-2 focus-visible:ring-brand/20"
          />
        </ToolbarGroup>
        <ToolbarSpacer />
        <Button type="button" size="sm" onClick={generate}>
          <RefreshCw /> Generate
        </Button>
      </Toolbar>

      <Panes>
        <Pane
          title="UUIDs"
          meta={plural(uuids.length, "UUID")}
          actions={
            <>
              <CopyButton text={output} shortcut />
              <DownloadButton content={output} filename="uuids.txt" mimeType="text/plain" />
            </>
          }
        >
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 flex-wrap items-center gap-x-5 gap-y-2 border-b border-line px-4 py-2.5">
              <Switch label="Uppercase" checked={uppercase} onChange={setUppercase} />
              <Switch label="Hyphens" checked={hyphens} onChange={setHyphens} />
              <Switch label="Braces" checked={braces} onChange={setBraces} />
            </div>
            <div className="relative min-h-0 flex-1">
              {output ? (
                <CodeView code={output} language="text" label="Generated UUIDs" />
              ) : (
                <EmptyState icon={IdCard} title="Press Generate" />
              )}
            </div>
          </div>
        </Pane>

        <Pane title="Inspect" meta={info?.summary ?? null}>
          <div className="flex h-full flex-col">
            <div className="flex shrink-0 items-center gap-2 border-b border-line py-1.5 pl-4 pr-2">
              <label htmlFor="uuid-inspect" className="font-mono text-[12px] text-ink-3">
                UUID
              </label>
              <input
                id="uuid-inspect"
                value={inspected}
                onChange={(event) => {
                  setInspectTouched(true);
                  setInspectInput(event.target.value);
                }}
                placeholder="Paste any UUID to see its version and timestamp"
                spellCheck={false}
                autoComplete="off"
                aria-invalid={Boolean(inspectError)}
                className="h-7 min-w-0 flex-1 rounded-md bg-transparent px-1.5 font-mono text-[13px] text-ink outline-none placeholder:font-sans placeholder:text-ink-4 focus-visible:ring-2 focus-visible:ring-brand/30 aria-[invalid=true]:text-destructive"
              />
            </div>
            {inspectError && (
              <p role="alert" className="shrink-0 border-b border-line bg-destructive/[0.04] px-4 py-2 text-[12px] text-destructive">
                {inspectError.message}
              </p>
            )}
            <div className="relative min-h-0 flex-1 overflow-auto">
              {info ? (
                <dl>
                  {info.fields.map((field) => (
                    <CopyRow key={field.label} label={field.label} value={field.value} />
                  ))}
                </dl>
              ) : (
                <EmptyState icon={ScanSearch} title="Paste a UUID">
                  Its version and variant show up here. Time-based versions also show when they were created.
                </EmptyState>
              )}
            </div>
          </div>
        </Pane>
      </Panes>

      <StatusBar
        kind="ok"
        label={`Generated ${plural(uuids.length, `${version} UUID`)}`}
        items={[version === "v7" ? "Sorted by creation time" : "122 random bits", uppercase && "Uppercase", !hyphens && "No hyphens", braces && "Braces"]}
      />
    </ToolLayout>
  );
};

export default UuidGenerator;
