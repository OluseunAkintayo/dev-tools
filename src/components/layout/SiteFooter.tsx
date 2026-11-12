import { Link } from "react-router-dom";

export const SiteFooter = () => (
  <footer className="border-t border-line">
    <div className="mx-auto flex max-w-[1120px] flex-wrap items-center justify-between gap-2 px-4 py-7 text-[13px] text-ink-3 sm:px-8">
      <p className="flex flex-wrap items-center gap-x-4 gap-y-1">
        <span>© {new Date().getFullYear()} NexTools</span>
        <Link to="/privacy" className="text-ink-2 hover:text-ink">
          Privacy
        </Link>
      </p>
      <p>
        Made by{" "}
        <a href="https://techydna.vercel.app/" target="_blank" rel="noopener noreferrer" className="text-ink-2 hover:text-ink">
          TechyDNA
        </a>
      </p>
    </div>
  </footer>
);
