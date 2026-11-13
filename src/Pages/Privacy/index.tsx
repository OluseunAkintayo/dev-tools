import { Link } from "react-router-dom";
import { ToolHeader } from "@/components/layout/SiteHeader";
import { SiteFooter } from "@/components/layout/SiteFooter";
import { useDocumentTitle } from "@/hooks/use-document-title";

const UPDATED = "12 November 2026";

/** What Vercel Web Analytics records with each page view, per Vercel's documentation. */
const ANALYTICS_FIELDS: [string, string][] = [
  ["Time of the visit", "2026-11-12 09:30"],
  ["Page address", "/json-formatter"],
  ["Referring site", "github.com"],
  ["Approximate location", "Country, region and city, from the network connection"],
  ["Operating system", "macOS 15"],
  ["Browser", "Chrome 140"],
  ["Device type", "Desktop, mobile or tablet"],
];

const SECTIONS = [
  { id: "inputs", title: "What you put into the tools" },
  { id: "device", title: "What is stored on your device" },
  { id: "analytics", title: "Analytics" },
  { id: "hosting", title: "Hosting" },
  { id: "third-parties", title: "Other services and links" },
  { id: "choices", title: "Your choices" },
  { id: "changes", title: "Changes to this policy" },
  { id: "contact", title: "Contact" },
];

const linkClass = "font-medium text-ink underline decoration-line-strong underline-offset-[3px] hover:decoration-ink-3";

const Privacy = () => {
  useDocumentTitle("Privacy policy | NexTools");

  return (
    <div className="flex min-h-[100dvh] flex-col">
      <ToolHeader />
      <main className="mx-auto w-full max-w-[1120px] flex-1 px-4 pb-20 pt-12 sm:px-8">
        <div className="grid gap-12 lg:grid-cols-[220px_minmax(0,1fr)]">
          <nav aria-label="On this page" className="hidden lg:block">
            <div className="sticky top-24">
              <p className="mb-3 text-[12px] font-medium uppercase tracking-[0.06em] text-ink-3">On this page</p>
              <ul className="space-y-2 text-[13px]">
                {SECTIONS.map((section) => (
                  <li key={section.id}>
                    <a href={`#${section.id}`} className="text-ink-3 hover:text-ink">
                      {section.title}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          </nav>

          <article className="max-w-[68ch] text-[15px] leading-7 text-ink-2 [&_h2]:mb-3 [&_h2]:mt-12 [&_h2]:scroll-mt-24 [&_h2]:text-[20px] [&_h2]:font-semibold [&_h2]:tracking-[-0.01em] [&_h2]:text-ink [&_li]:mt-1.5 [&_p]:mt-3 [&_ul]:mt-3 [&_ul]:list-disc [&_ul]:pl-5">
            <p className="!mt-0 font-mono text-[13px] font-medium text-brand">Privacy policy</p>
            <h1 className="mt-3 text-[32px] font-semibold leading-tight tracking-[-0.025em] text-ink sm:text-[36px]">Your data stays in your browser</h1>
            <p className="text-ink-3">Last updated {UPDATED}</p>

            <div className="mt-8 rounded-2xl border border-line bg-surface p-5 sm:p-6">
              <p className="!mt-0 font-semibold text-ink">The short version</p>
              <ul className="!list-none !pl-0 [&_li]:flex [&_li]:gap-2.5 [&_li]:before:text-brand [&_li]:before:content-['✓']">
                <li>What you paste, type or drop into a tool is processed on your device and never sent to us.</li>
                <li>There are no accounts, no cookies and no ads.</li>
                <li>We count anonymous page views to see which tools people use. That count can't be tied to you.</li>
              </ul>
            </div>

            <h2 id="inputs">What you put into the tools</h2>
            <p>
              Every tool on NexTools runs in your browser. The text you type or paste, the files you open or drop, and the secrets and keys you enter (for example in
              the JWT or Hash tools) are processed on your device. They are not uploaded to a server, and we never receive, store or log them.
            </p>
            <ul>
              <li>Files are read by your browser. Large files are processed in a background thread of the same page, not on a server.</li>
              <li>Your inputs live only in the open tab, and closing the tab clears them.</li>
              <li>
                When you send a result to another tool, it moves within the same tab and is not transmitted anywhere. Your browser keeps it in that tab’s history so
                Back and Reload still show it, until you close the tab.
              </li>
              <li>
                The <strong className="font-medium text-ink">Paste</strong> button reads your clipboard only when you press it, and your browser may ask for permission
                first. The <strong className="font-medium text-ink">Copy</strong> button writes to your clipboard only when you press it.
              </li>
            </ul>
            <p>
              Because nothing leaves your device, you can use the tools with API responses, exports and tokens. Treat production secrets with your usual care: anyone
              with access to your screen or device can still see them.
            </p>

            <h2 id="device">What is stored on your device</h2>
            <p>
              NexTools stores one setting in your browser’s local storage: <code className="rounded bg-sunken px-1.5 py-0.5 font-mono text-[13px] text-ink">nextools-theme</code>, which
              remembers whether you chose the light, dark or system theme. It never leaves your device. NexTools sets no cookies.
            </p>
            <p>
              So that NexTools works offline, your browser also keeps a copy of the app’s own files (its code, styles, fonts and icons) using a service worker. This copy
              contains no inputs or personal data, and it is replaced when a new version of NexTools is released.
            </p>

            <h2 id="analytics">Analytics</h2>
            <p>
              We use{" "}
              <a href="https://vercel.com/docs/analytics/privacy-policy" target="_blank" rel="noopener noreferrer" className={linkClass}>
                Vercel Web Analytics
              </a>{" "}
              to count page views, so we know which tools are used and where visitors come from. It does not use cookies. To tell visits apart, Vercel creates a
              temporary identifier from each request and discards it after 24 hours, so a visit can’t be followed across days or across other websites.
            </p>
            <p>Each page view may include the following, which we see only as totals:</p>
            <div className="mt-4 overflow-hidden rounded-xl border border-line">
              <table className="w-full text-left text-[14px]">
                <thead className="bg-gutter text-[12px] text-ink-3">
                  <tr>
                    <th scope="col" className="px-4 py-2 font-medium">
                      What
                    </th>
                    <th scope="col" className="px-4 py-2 font-medium">
                      Example
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {ANALYTICS_FIELDS.map(([what, example]) => (
                    <tr key={what} className="border-t border-line">
                      <td className="px-4 py-2 text-ink">{what}</td>
                      <td className="px-4 py-2 text-ink-3">{example}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p>
              Page addresses on NexTools contain only the tool’s name and, for some tools, a mode such as <code className="font-mono text-[13px]">?mode=encode</code>. Your
              inputs are never part of the address, so they can’t reach the analytics.
            </p>

            <h2 id="hosting">Hosting</h2>
            <p>
              NexTools is hosted on Vercel. As with any website, Vercel’s servers receive technical information when your browser requests a page, such as your IP
              address and browser type, to deliver the page and protect the service from abuse. Vercel handles this under its{" "}
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noopener noreferrer" className={linkClass}>
                privacy policy
              </a>
              . We don’t use this information to identify you.
            </p>

            <h2 id="third-parties">Other services and links</h2>
            <p>
              Fonts, icons and every other part of NexTools, including the analytics script, are served from the site itself, so your browser doesn’t contact any
              company other than Vercel while you use it. There
              are no ads, social media widgets or embedded content from other sites. Links to other websites, such as documentation, open those sites, which have
              their own privacy policies.
            </p>

            <h2 id="choices">Your choices</h2>
            <ul>
              <li>Content blockers and privacy settings that block analytics work here, and every tool keeps working.</li>
              <li>Clearing this site’s data in your browser removes the saved theme and the offline copy of the app.</li>
              <li>Because we hold no personal data from the tools, there is nothing of yours for us to export or delete.</li>
            </ul>

            <h2 id="changes">Changes to this policy</h2>
            <p>
              If we change what NexTools collects or stores, for example by adding a feature that keeps your inputs after a reload, we will update this page and the
              date at the top before the change goes live.
            </p>

            <h2 id="contact">Contact</h2>
            <p>
              Questions or concerns about privacy? Open an issue on{" "}
              <a href="https://github.com/OluseunAkintayo/dev-tools/issues" target="_blank" rel="noopener noreferrer" className={linkClass}>
                GitHub
              </a>
              . You can also read the{" "}
              <a href="https://github.com/OluseunAkintayo/dev-tools" target="_blank" rel="noopener noreferrer" className={linkClass}>
                source code
              </a>{" "}
              to check how the tools handle your data.
            </p>

            <p className="!mt-12 border-t border-line pt-6 text-[14px] text-ink-3">
              <Link to="/" className={linkClass}>
                Back to the tools
              </Link>
            </p>
          </article>
        </div>
      </main>
      <SiteFooter />
    </div>
  );
};

export default Privacy;
