import React from "react";
import { Link } from "react-router-dom";
import { ToolHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useDocumentTitle } from "@/hooks/use-document-title";
import type { Handoff } from "@/lib/handoff";
import { getTool, type ToolId } from "@/lib/tools";

export interface NextStep {
  to: ToolId;
  label: string;
  /** Output to carry into the next tool, if any. */
  handoff?: Handoff;
}

interface ToolLayoutProps {
  toolId: ToolId;
  children: React.ReactNode;
  next?: NextStep[];
}

const NextSteps = ({ steps }: { steps: NextStep[] }) => (
  <nav aria-label="Next step" className="flex flex-wrap items-center gap-2 pt-7 text-[13px] text-ink-3">
    <span className="mr-1">Next step</span>
    {steps.map((step) => {
      const target = getTool(step.to);
      const Icon = target.icon;
      return (
        <Link
          key={step.to}
          to={target.link}
          state={step.handoff}
          className="press inline-flex h-[30px] items-center gap-1.5 rounded-full border border-line-strong bg-surface px-3 text-ink-2 hover:border-ink/20 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          <Icon className="h-3.5 w-3.5" />
          {step.label}
        </Link>
      );
    })}
  </nav>
);

export const ToolLayout = ({ toolId, children, next }: ToolLayoutProps) => {
  const tool = getTool(toolId);
  useDocumentTitle(`${tool.title} | NexTools`);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <ToolHeader tool={tool} />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-14 sm:px-8">
        <div className="pb-5 pt-9">
          <h1 className="text-[28px] font-semibold leading-tight tracking-[-0.025em] sm:text-[30px]">{tool.title}</h1>
          <p className="mt-1.5 max-w-[65ch] text-[15px] text-ink-3">{tool.intro}</p>
        </div>
        {children}
        {next && next.length > 0 && <NextSteps steps={next} />}
      </main>
      <SiteFooter />
    </div>
  );
};
