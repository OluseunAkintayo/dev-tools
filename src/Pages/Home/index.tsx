import React from "react";
import { useLocation } from "react-router-dom";
import { Download, LayoutGrid, Moon, Search, ShieldCheck } from "lucide-react";
import { SmartPaste } from "@/components/home/SmartPaste";
import { ToolGrid } from "@/components/home/ToolGrid";
import { LandingHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Button } from "@/components/ui/button";
import { modKey } from "@/lib/platform";
import { categoryStyles } from "@/lib/categoryStyles";
import { categories } from "@/lib/tools";

/** Staggered entrance for the hero, played once on load. */
const rise = (index: number): React.CSSProperties => ({ animationDelay: `${index * 60}ms` });

const facts = [
  {
    icon: ShieldCheck,
    title: "No uploads, no account",
    body: <>Files you drop are read locally and never leave the page.</>,
  },
  {
    icon: Search,
    title: "Keyboard first",
    body: (
      <>
        <kbd className="kbd">{modKey}K</kbd> to switch tools, <kbd className="kbd">{modKey}↵</kbd> to run, <kbd className="kbd">{modKey}⇧↵</kbd> to copy the result.
      </>
    ),
  },
  {
    icon: Download,
    title: "Copy or download in one click",
    body: <>Results save with the right file extension.</>,
  },
  {
    icon: Moon,
    title: "Light and dark",
    body: <>Follows your system setting, or pick one yourself.</>,
  },
];

const Home = () => {
  const location = useLocation();
  useDocumentTitle("NexTools: your utility tools, all in one place");

  // Support deep links such as /#tools from other pages.
  React.useEffect(() => {
    if (!location.hash) return;
    document.getElementById(location.hash.slice(1))?.scrollIntoView();
  }, [location.hash]);

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <LandingHeader />
      <main className="flex-1">
        <section className="mx-auto max-w-[1120px] px-4 pb-20 pt-16 sm:px-8 md:pb-24 md:pt-[88px]">
          <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
            <div>
              <h1 className="max-w-[12em] animate-rise text-[40px] font-semibold leading-[1.04] tracking-[-0.035em] sm:text-[52px] lg:text-[56px]" style={rise(0)}>
                Your utility tools, all in one place
              </h1>
              <p className="mt-5 max-w-[40ch] animate-rise text-lg leading-relaxed text-ink-2" style={rise(1)}>
                Formatters, converters, generators and encoders in one fast, private workspace. New tools ship regularly.
              </p>
              <ul aria-label="Categories" className="mt-10 flex animate-rise flex-wrap gap-x-5 gap-y-2 text-[13px] text-ink-3" style={rise(3)}>
                {categories.map((category) => (
                  <li key={category.id} className="inline-flex items-center gap-1.5">
                    <category.icon className={`h-3.5 w-3.5 ${categoryStyles[category.id].text}`} />
                    {category.label}
                  </li>
                ))}
              </ul>
              <div className="mt-8 flex animate-rise flex-wrap gap-2.5" style={rise(2)}>
                <Button asChild>
                  <a href="#tools">
                    <LayoutGrid /> Explore tools
                  </a>
                </Button>
              </div>
            </div>
            <div className="animate-rise" style={rise(2)}>
              <SmartPaste />
            </div>
          </div>
        </section>

        <section id="tools" className="scroll-mt-16 border-t border-line py-20 md:py-24">
          <div className="mx-auto max-w-[1120px] px-4 sm:px-8">
            <p className="mb-3 text-[13px] font-medium text-brand">Tools</p>
            <h2 className="max-w-[20ch] text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[36px]">One place for the small jobs that slow you down.</h2>
            <p className="mt-3.5 max-w-[54ch] text-ink-2">Start with formatting, conversion and code generation. More categories are on the way.</p>
            <ToolGrid />
          </div>
        </section>

        <section id="privacy" className="scroll-mt-16 border-t border-line py-20 md:py-24">
          <div className="mx-auto grid max-w-[1120px] items-start gap-10 px-4 sm:px-8 lg:grid-cols-2 lg:gap-16">
            <div>
              <h2 className="max-w-[20ch] text-[30px] font-semibold leading-[1.1] tracking-[-0.025em] sm:text-[36px]">Your data stays in this tab.</h2>
              <p className="mt-3.5 max-w-[48ch] text-ink-2">
                Every tool runs in the browser.<br />
                Paste API responses, exports or tokens without sending them to a server.
              </p>
            </div>
            <ul>
              {facts.map((fact, index) => (
                <li key={fact.title} className={`grid grid-cols-[36px_1fr] gap-3.5 py-4 ${index > 0 ? "border-t border-line" : ""}`}>
                  <span className="grid h-9 w-9 place-items-center rounded-[10px] bg-brand/10 text-brand">
                    <fact.icon className="h-4 w-4" />
                  </span>
                  <div>
                    <p className="font-semibold">{fact.title}</p>
                    <p className="text-sm leading-relaxed text-ink-3">{fact.body}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Home;
