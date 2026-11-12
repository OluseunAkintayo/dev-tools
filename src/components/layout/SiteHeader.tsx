import { Link } from "react-router-dom";
import { ChevronDown, Moon, Search, Sun, Wrench } from "lucide-react";
import { useCommandMenu } from "@/components/command/CommandMenu";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { useTheme } from "@/hooks/use-theme";
import { modKey } from "@/lib/platform";
import { categoryStyles } from "@/lib/categoryStyles";
import { getCategory, type Tool } from "@/lib/tools";
import { cn } from "@/lib/utils";

const Logo = ({ withName = true }: { withName?: boolean }) => (
  <Link to="/" className="press flex items-center gap-2.5 rounded-lg font-semibold tracking-[-0.01em] text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40">
    <span className="grid h-[26px] w-[26px] place-items-center rounded-lg bg-primary text-primary-foreground">
      <Wrench className="h-3.5 w-3.5" strokeWidth={2} />
    </span>
    {withName ? "NexTools" : <span className="sr-only">NexTools home</span>}
  </Link>
);

const SearchButton = () => {
  const { open } = useCommandMenu();
  return (
    <button
      type="button"
      onClick={open}
      className="press flex h-[34px] items-center gap-2.5 rounded-[10px] border border-line-strong bg-surface pl-3 pr-2 text-sm text-ink-3 hover:border-ink/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40 sm:min-w-[220px]"
    >
      <Search className="h-4 w-4" />
      <span className="hidden flex-1 text-left sm:inline">Search tools</span>
      <kbd className="kbd hidden sm:inline-flex">{modKey}K</kbd>
    </button>
  );
};

const ThemeButton = () => {
  const { resolved, toggle } = useTheme();
  const label = resolved === "dark" ? "Switch to light mode" : "Switch to dark mode";
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <button
          type="button"
          onClick={toggle}
          aria-label={label}
          className="press grid h-[34px] w-[34px] place-items-center rounded-[10px] border border-line-strong bg-surface text-ink-2 hover:text-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
        >
          {resolved === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
};

const Shell = ({ children }: { children: React.ReactNode }) => (
  <header className="material sticky top-0 z-40 border-b border-line">
    <div className="mx-auto flex h-[60px] max-w-[1120px] items-center gap-6 px-4 sm:px-8">{children}</div>
  </header>
);

export const LandingHeader = () => (
  <Shell>
    <Logo />
    <nav aria-label="Main" className="hidden items-center gap-6 text-sm text-ink-2 md:flex">
      <a href="#tools" className="hover:text-ink">
        Tools
      </a>
      <a href="#privacy" className="hover:text-ink">
        Privacy
      </a>
    </nav>
    <div className="ml-auto flex items-center gap-2">
      <SearchButton />
      <ThemeButton />
    </div>
  </Shell>
);

export const ToolHeader = ({ tool }: { tool?: Tool }) => {
  const { open } = useCommandMenu();
  return (
    <Shell>
      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-2.5 text-sm">
        <Logo withName={!tool} />
        {tool && (
          <>
            <span className="text-ink-4" aria-hidden="true">
              /
            </span>
            <span className={cn("hidden font-medium sm:inline", categoryStyles[tool.category].text)}>{getCategory(tool.category).label}</span>
            <span className="hidden text-ink-4 sm:inline" aria-hidden="true">
              /
            </span>
            <button
              type="button"
              onClick={open}
              aria-label={`${tool.title}. Switch tool`}
              className="press flex h-[30px] min-w-0 items-center gap-1.5 rounded-lg pl-2.5 pr-2 font-medium text-ink hover:bg-sunken focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-brand/40"
            >
              <span className="truncate">{tool.title}</span>
              <ChevronDown className="h-3.5 w-3.5 shrink-0 text-ink-3" />
            </button>
          </>
        )}
      </nav>
      <div className="ml-auto flex items-center gap-2">
        <SearchButton />
        <ThemeButton />
      </div>
    </Shell>
  );
};
