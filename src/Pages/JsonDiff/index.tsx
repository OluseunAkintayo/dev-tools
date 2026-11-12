import React from "react";
import { ArrowLeftRight, CircleCheck, GitCompareArrows } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { Button } from "@/components/ui/button";
import { CodeEditor } from "@/components/workspace/CodeEditor";
import { Segmented, Switch } from "@/components/workspace/controls";
import { EmptyState, ErrorNotice } from "@/components/workspace/Feedback";
import { CopyButton, OpenFileButton, PasteButton } from "@/components/workspace/actions";
import { ClearButton } from "@/components/workspace/run";
import { Pane, Panes, StatusBar, Toolbar, ToolbarGroup, ToolbarSpacer } from "@/components/workspace/Workspace";
import { useFileLoader } from "@/hooks/use-file-loader";
import { useToolRunner } from "@/hooks/use-tool-runner";
import { diffJson, diffReport, type ChangeKind } from "@/lib/jsonDiff";
import { plural } from "@/lib/text";
import { parseJson } from "@/lib/toolError";
import { ChangeList } from "./ChangeList";

type Filter = "all" | ChangeKind;

const JsonDiff = () => {
  const [left, setLeft] = React.useState("");
  const [right, setRight] = React.useState("");
  const [leftName, setLeftName] = React.useState<string | null>(null);
  const [rightName, setRightName] = React.useState<string | null>(null);
  const [ignoreArrayOrder, setIgnoreArrayOrder] = React.useState(false);
  const [filter, setFilter] = React.useState<Filter>("all");

  const leftRunner = useToolRunner(left, parseJson, []);
  const rightRunner = useToolRunner(right, parseJson, []);
  const ready = leftRunner.outcome.kind === "ok" && rightRunner.outcome.kind === "ok";
  const leftValue = leftRunner.outcome.kind === "ok" ? leftRunner.outcome.value : undefined;
  const rightValue = rightRunner.outcome.kind === "ok" ? rightRunner.outcome.value : undefined;

  const changes = React.useMemo(() => (ready ? diffJson(leftValue, rightValue, { ignoreArrayOrder }) : null), [ready, leftValue, rightValue, ignoreArrayOrder]);
  const counts = React.useMemo(
    () => ({
      added: changes?.filter((change) => change.kind === "added").length ?? 0,
      removed: changes?.filter((change) => change.kind === "removed").length ?? 0,
      changed: changes?.filter((change) => change.kind === "changed").length ?? 0,
    }),
    [changes]
  );
  const shown = React.useMemo(() => (changes && filter !== "all" ? changes.filter((change) => change.kind === filter) : changes ?? []), [changes, filter]);

  const leftFiles = useFileLoader({
    extensions: [".json"],
    onLoad: (text, file) => {
      setLeft(text);
      setLeftName(file.name);
    },
  });
  const rightFiles = useFileLoader({
    extensions: [".json"],
    onLoad: (text, file) => {
      setRight(text);
      setRightName(file.name);
    },
  });

  const swap = () => {
    setLeft(right);
    setRight(left);
    setLeftName(rightName);
    setRightName(leftName);
  };

  const clear = () => {
    setLeft("");
    setRight("");
    setLeftName(null);
    setRightName(null);
  };

  const filterOptions: { value: Filter; label: string }[] = [
    { value: "all", label: `All ${changes?.length ?? 0}` },
    { value: "added", label: `Added ${counts.added}` },
    { value: "removed", label: `Removed ${counts.removed}` },
    { value: "changed", label: `Changed ${counts.changed}` },
  ];

  const status =
    leftRunner.visibleError || rightRunner.visibleError
      ? { kind: "error" as const, label: `Invalid JSON in ${leftRunner.visibleError ? "Original" : "Modified"}` }
      : !changes
        ? { kind: "idle" as const, label: !left.trim() || !right.trim() ? "Paste JSON into both sides" : "Editing" }
        : changes.length === 0
          ? { kind: "ok" as const, label: "No differences" }
          : { kind: "ok" as const, label: plural(changes.length, "difference") };

  return (
    <ToolLayout toolId="json-diff">
      <Toolbar>
        <Switch label="Ignore array order" checked={ignoreArrayOrder} onChange={setIgnoreArrayOrder} />
        <p className="hidden pl-1 text-[13px] text-ink-3 lg:block">Key order never counts as a difference.</p>
        <ToolbarSpacer />
        <ToolbarGroup>
          <Button type="button" variant="ghost" size="sm" onClick={swap} disabled={!left && !right}>
            <ArrowLeftRight /> Swap
          </Button>
          <ClearButton onClick={clear} disabled={!left && !right} />
        </ToolbarGroup>
      </Toolbar>

      <Panes className="md:h-[min(46vh,440px)]">
        <Pane
          title="Original"
          meta={leftName}
          onFileDrop={leftFiles.load}
          actions={
            <>
              <PasteButton onPaste={setLeft} />
              <OpenFileButton accept={leftFiles.accept} onFile={leftFiles.load} disabled={leftFiles.loading} />
            </>
          }
        >
          <CodeEditor label="Original JSON" value={left} onChange={setLeft} placeholder="Paste the original JSON, or drop a .json file" errorLine={leftRunner.visibleError?.line} autoFocus />
          {leftRunner.visibleError && <ErrorNotice error={leftRunner.visibleError} onFix={leftRunner.visibleError.fix ? () => setLeft(leftRunner.visibleError!.fix!.apply(left)) : undefined} />}
        </Pane>
        <Pane
          title="Modified"
          meta={rightName}
          onFileDrop={rightFiles.load}
          actions={
            <>
              <PasteButton onPaste={setRight} />
              <OpenFileButton accept={rightFiles.accept} onFile={rightFiles.load} disabled={rightFiles.loading} />
            </>
          }
        >
          <CodeEditor label="Modified JSON" value={right} onChange={setRight} placeholder="Paste the changed JSON, or drop a .json file" errorLine={rightRunner.visibleError?.line} />
          {rightRunner.visibleError && <ErrorNotice error={rightRunner.visibleError} onFix={rightRunner.visibleError.fix ? () => setRight(rightRunner.visibleError!.fix!.apply(right)) : undefined} />}
        </Pane>
      </Panes>

      <section aria-labelledby="diff-title" className="border-x border-b border-line bg-surface">
        <header className="flex min-h-11 flex-wrap items-center gap-2 border-b border-line py-1.5 pl-4 pr-2">
          <h2 id="diff-title" className="text-[13px] font-medium text-ink">
            Differences
          </h2>
          {changes && changes.length > 0 && <Segmented label="Show" value={filter} options={filterOptions} onChange={setFilter} className="ml-2" />}
          <div className="ml-auto">
            <CopyButton text={changes ? diffReport(shown) : ""} shortcut />
          </div>
        </header>
        <div className="relative max-h-[60vh] min-h-[180px] overflow-auto">
          {!changes ? (
            <EmptyState icon={GitCompareArrows} title="Paste JSON into both sides">
              Additions, removals and changed values are listed here by path.
            </EmptyState>
          ) : changes.length === 0 ? (
            <EmptyState icon={CircleCheck} title="The two documents are equal">
              {ignoreArrayOrder ? "Arrays were compared as unordered collections." : "Key order is ignored; array order counts."}
            </EmptyState>
          ) : (
            <ChangeList changes={shown} />
          )}
        </div>
      </section>

      <StatusBar
        kind={status.kind}
        label={status.label}
        items={changes && changes.length ? [`+${counts.added}`, `−${counts.removed}`, `~${counts.changed}`, ignoreArrayOrder && "Array order ignored"] : []}
      />
    </ToolLayout>
  );
};

export default JsonDiff;
