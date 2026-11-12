import { Link } from "react-router-dom";
import { ArrowRight, Search } from "lucide-react";
import { useCommandMenu } from "@/components/command/CommandMenu";
import { ToolHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { modKey } from "@/lib/platform";

export default function NotFound() {
  const { open } = useCommandMenu();
  useDocumentTitle("Page not found | NexTools");

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <ToolHeader />
      <main className="mx-auto grid w-full max-w-[1120px] flex-1 place-items-center px-4 py-24 sm:px-8">
        <div className="max-w-[44ch] text-center">
          <p className="font-mono text-[13px] font-medium text-brand">404</p>
          <h1 className="mt-3 text-[32px] font-semibold leading-tight tracking-[-0.025em]">This page does not exist</h1>
          <p className="mt-3 text-ink-3">The link may be old, or the tool may have moved. Search for it, or start from the home page.</p>
          <div className="mt-8 flex flex-wrap justify-center gap-2.5">
            <Button asChild>
              <Link to="/">
                Go to home page <ArrowRight />
              </Link>
            </Button>
            <Button variant="outline" onClick={open}>
              <Search /> Search tools <kbd className="kbd ml-1">{modKey}K</kbd>
            </Button>
          </div>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
}
