import { Link } from "react-router-dom";
import { ArrowRight, Palette } from "lucide-react";
import { ToolLayout } from "@/components/layout/ToolLayout";
import { Button } from "@/components/ui/button";

export default function ComingSoon() {
  return (
    <ToolLayout toolId="shadcn-theme">
      <div className="grid place-items-center rounded-2xl border border-dashed border-line-strong bg-surface/50 px-6 py-20 text-center">
        <div className="max-w-[40ch]">
          <span className="mx-auto mb-4 grid h-11 w-11 place-items-center rounded-xl bg-sunken text-ink-2">
            <Palette className="h-5 w-5" />
          </span>
          <span className="inline-block rounded-full border border-line-strong px-2.5 py-0.5 text-[12px] font-medium text-ink-3">In progress</span>
          <h2 className="mt-3 text-lg font-semibold tracking-[-0.01em]">This tool is being built</h2>
          <p className="mt-1.5 text-sm text-ink-3">It will generate the CSS variables shadcn/ui needs from a few base colors. In the meantime, the other tools are ready to use.</p>
          <Button asChild variant="outline" className="mt-6">
            <Link to="/#tools">
              See all tools <ArrowRight />
            </Link>
          </Button>
        </div>
      </div>
    </ToolLayout>
  );
}
