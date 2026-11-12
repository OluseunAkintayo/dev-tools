import React from "react";
import { Link2 } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { CopyRow } from "@/components/workspace/CopyRow";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton } from "@/components/workspace/run";
import { outputOf, statusFor } from "@/components/workspace/status";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { plural } from "@/lib/text";
import { parseUrl, withQuery } from "@/lib/url";
import { ParamsTable } from "./ParamsTable";

interface ParserProps {
  modeControl: React.ReactNode;
  input: string;
  onInputChange: (value: string) => void;
}

export const UrlParser = ({ modeControl, input, onInputChange }: ParserProps) => {
  const runner = useToolRunner(input, parseUrl, []);
  const parsed = outputOf(runner);
  const error = runner.visibleError;
  const dimmed = runner.outcome.kind === "error";
  const status = statusFor(runner, { ok: "Valid URL", error: "Invalid URL", runLabel: "Parse", idle: "Waiting for a URL" });
  const paramsJson = parsed ? JSON.stringify(Object.fromEntries(parsed.params), null, 2) : "";

  return (
    <ToolLayout toolId="url" next={[{ to: "json-formatter", label: "Open query as JSON", handoff: parsed?.params.length ? { input: paramsJson } : undefined }]}>
      <Toolbar>
        {modeControl}
        <p className="hidden pl-1 text-[13px] text-ink-3 lg:block">Edit the query table to rebuild the URL.</p>
        <ToolbarSpacer />
        <ToolbarGroup>
          <ClearButton onClick={() => onInputChange("")} disabled={!input} />
        </ToolbarGroup>
      </Toolbar>

      <Panes>
        <Pane title="URL" actions={<PasteButton onPaste={(text) => onInputChange(text.trim())} />}>
          <div className="flex h-full flex-col">
            <div className="relative h-[7.5rem] shrink-0 border-b border-line">
              <CodeEditor label="URL" value={input} onChange={onInputChange} placeholder="https://example.com/search?q=url+parser&page=2#results" wrap autoFocus />
              {error && <ErrorNotice error={error} />}
            </div>
            <div className="flex h-10 shrink-0 items-center justify-between border-b border-line pl-4 pr-2">
              <h3 className="text-[13px] font-medium text-ink">Query parameters</h3>
              {parsed && parsed.params.length > 0 && <span className="text-[12px] text-ink-3">{plural(parsed.params.length, "parameter")}</span>}
            </div>
            <div className="min-h-0 flex-1 overflow-auto">
              {parsed ? (
                <ParamsTable params={parsed.params} onChange={(params) => onInputChange(withQuery(input, params))} disabled={dimmed} />
              ) : (
                <p className="px-4 py-3 text-[13px] text-ink-3">Parameters show up here once the URL is valid.</p>
              )}
            </div>
          </div>
        </Pane>

        <Pane title="Parts" actions={<CopyButton text={input.trim()} />}>
          {parsed ? (
            <div className="h-full overflow-auto">
              {parsed.assumedScheme && (
                <p className="border-b border-line bg-gutter px-4 py-2 text-[12px] text-ink-3">No scheme given, so {parsed.parts[0].value}:// was assumed.</p>
              )}
              <dl>
                {parsed.parts.map((part) => (
                  <CopyRow key={part.id} label={part.label} value={part.value} dimmed={dimmed} />
                ))}
              </dl>
            </div>
          ) : (
            <EmptyState icon={Link2} title="Paste a URL">
              Its scheme, host, path, query and fragment show up here, each with a copy button.
            </EmptyState>
          )}
        </Pane>
      </Panes>

      <StatusBar
        kind={status.kind}
        label={status.label}
        items={runner.outcome.kind === "ok" && parsed ? [parsed.parts[0].value, plural(parsed.params.length, "parameter")] : []}
      />
    </ToolLayout>
  );
};
