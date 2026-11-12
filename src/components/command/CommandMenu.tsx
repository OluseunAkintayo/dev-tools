import React from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { useNavigate } from "react-router-dom";
import { CornerDownLeft, House, Monitor, Moon, Search, Sun } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useTheme } from "@/hooks/use-theme";
import { useShortcut } from "@/hooks/use-shortcut";
import { categoryStyles } from "@/lib/categoryStyles";
import { getCategory, searchTools } from "@/lib/tools";
import { cn } from "@/lib/utils";

interface CommandMenuContextValue {
  open: () => void;
}

const CommandMenuContext = React.createContext<CommandMenuContextValue>({ open: () => {} });

// eslint-disable-next-line react-refresh/only-export-components
export const useCommandMenu = () => React.useContext(CommandMenuContext);

interface Item {
  id: string;
  group: "Tools" | "Actions";
  label: string;
  hint?: string;
  /** Category colour for the icon and hint. */
  tone?: string;
  icon: LucideIcon;
  disabled?: boolean;
  run: () => void;
}

const Highlight = ({ text, query }: { text: string; query: string }) => {
  const q = query.trim();
  const index = q ? text.toLowerCase().indexOf(q.toLowerCase()) : -1;
  if (index < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, index)}
      <mark className="bg-transparent font-semibold text-ink">{text.slice(index, index + q.length)}</mark>
      {text.slice(index + q.length)}
    </>
  );
};

/**
 * ⌘K tool switcher. Opens with no animation: it is used many times a day,
 * and motion would only make it feel slower.
 */
export const CommandMenuProvider = ({ children }: { children: React.ReactNode }) => {
  const [open, setOpen] = React.useState(false);
  const [query, setQuery] = React.useState("");
  const [active, setActive] = React.useState(0);
  const navigate = useNavigate();
  const { resolved, preference, setPreference } = useTheme();
  const listRef = React.useRef<HTMLDivElement>(null);

  useShortcut({ key: "k", mod: true }, () => setOpen((value) => !value));

  const close = React.useCallback(() => setOpen(false), []);

  const items = React.useMemo<Item[]>(() => {
    const toolItems: Item[] = searchTools(query).map((tool) => ({
      id: tool.id,
      group: "Tools",
      label: tool.title,
      hint: tool.status === "soon" ? "In progress" : getCategory(tool.category).label,
      tone: categoryStyles[tool.category].text,
      icon: tool.icon,
      run: () => navigate(tool.link),
    }));
    const actions: Item[] = [
      { id: "home", group: "Actions", label: "Go to home page", icon: House, run: () => navigate("/") },
      {
        id: "theme",
        group: "Actions",
        label: resolved === "dark" ? "Switch to light mode" : "Switch to dark mode",
        icon: resolved === "dark" ? Sun : Moon,
        run: () => setPreference(resolved === "dark" ? "light" : "dark"),
      },
      {
        id: "system",
        group: "Actions",
        label: "Match system theme",
        hint: preference === "system" ? "On" : undefined,
        icon: Monitor,
        run: () => setPreference("system"),
      },
    ];
    const q = query.trim().toLowerCase();
    const matchedActions = q ? actions.filter((action) => action.label.toLowerCase().includes(q)) : actions;
    return [...toolItems, ...matchedActions];
  }, [query, navigate, resolved, preference, setPreference]);

  React.useEffect(() => setActive(0), [query]);
  React.useEffect(() => {
    if (!open) setQuery("");
  }, [open]);

  React.useEffect(() => {
    listRef.current?.querySelector<HTMLElement>(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [active]);

  const select = (item: Item | undefined) => {
    if (!item || item.disabled) return;
    close();
    item.run();
  };

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % Math.max(items.length, 1));
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index - 1 + items.length) % Math.max(items.length, 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      select(items[active]);
    }
  };

  const contextValue = React.useMemo(() => ({ open: () => setOpen(true) }), []);
  let lastGroup: string | null = null;

  return (
    <CommandMenuContext.Provider value={contextValue}>
      {children}
      <Dialog.Root open={open} onOpenChange={setOpen}>
        <Dialog.Portal>
          <Dialog.Overlay className="fixed inset-0 z-50 bg-ink/20 dark:bg-black/50" />
          <Dialog.Content
            onKeyDown={onKeyDown}
            aria-describedby={undefined}
            className="material fixed left-1/2 top-[14vh] z-50 w-[calc(100%-2rem)] max-w-[520px] -translate-x-1/2 overflow-hidden rounded-2xl bg-surface/90 shadow-float focus:outline-none"
          >
            <Dialog.Title className="sr-only">Search tools and actions</Dialog.Title>
            <div className="flex h-[52px] items-center gap-3 border-b border-line px-4">
              <Search className="h-4 w-4 shrink-0 text-ink-3" />
              <input
                autoFocus
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search tools and actions"
                aria-label="Search tools and actions"
                aria-controls="command-list"
                aria-activedescendant={items[active] ? `command-${items[active].id}` : undefined}
                role="combobox"
                aria-expanded="true"
                className="h-full flex-1 bg-transparent text-[15px] text-ink outline-none placeholder:text-ink-3"
              />
              <kbd className="kbd">esc</kbd>
            </div>
            <div ref={listRef} id="command-list" role="listbox" aria-label="Results" className="max-h-[min(380px,52vh)] overflow-y-auto p-1.5">
              {items.length === 0 && <p className="px-3 py-8 text-center text-sm text-ink-3">No tools match “{query}”.</p>}
              {items.map((item, index) => {
                const header = item.group !== lastGroup ? item.group : null;
                lastGroup = item.group;
                const Icon = item.icon;
                return (
                  <React.Fragment key={item.id}>
                    {header && <div className="px-2.5 pb-1 pt-2.5 text-[12px] font-medium text-ink-3">{header}</div>}
                    <div
                      id={`command-${item.id}`}
                      role="option"
                      aria-selected={index === active}
                      data-index={index}
                      onMouseMove={() => index !== active && setActive(index)}
                      onClick={() => select(item)}
                      className={cn(
                        "flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-sm text-ink-2",
                        index === active && "bg-sunken text-ink"
                      )}
                    >
                      <Icon className={cn("h-4 w-4 shrink-0", item.tone)} />
                      <span className="flex-1 truncate">
                        <Highlight text={item.label} query={query} />
                      </span>
                      {item.hint && (
                        <span className={cn("text-[12px]", item.tone && item.hint !== "In progress" ? cn("font-medium", item.tone) : "text-ink-3")}>{item.hint}</span>
                      )}
                      {index === active && <CornerDownLeft className="h-3.5 w-3.5 text-ink-3" />}
                    </div>
                  </React.Fragment>
                );
              })}
            </div>
            <div className="flex gap-4 border-t border-line px-4 py-2.5 text-[12px] text-ink-3">
              <span className="flex items-center gap-1">
                <kbd className="kbd">↑</kbd>
                <kbd className="kbd">↓</kbd> move
              </span>
              <span className="flex items-center gap-1">
                <kbd className="kbd">↵</kbd> open
              </span>
            </div>
          </Dialog.Content>
        </Dialog.Portal>
      </Dialog.Root>
    </CommandMenuContext.Provider>
  );
};
