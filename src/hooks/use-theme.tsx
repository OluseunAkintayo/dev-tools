import React from "react";

export type ThemePreference = "light" | "dark" | "system";
type ResolvedTheme = "light" | "dark";

const STORAGE_KEY = "nextools-theme";

interface ThemeContextValue {
  preference: ThemePreference;
  resolved: ResolvedTheme;
  setPreference: (preference: ThemePreference) => void;
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

const systemQuery = () => window.matchMedia("(prefers-color-scheme: dark)");

const readPreference = (): ThemePreference => {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === "light" || saved === "dark" || saved === "system") return saved;
  } catch {
    // Storage can be unavailable (private mode, blocked cookies).
  }
  return "system";
};

const resolve = (preference: ThemePreference): ResolvedTheme =>
  preference === "system" ? (systemQuery().matches ? "dark" : "light") : preference;

/** Swap the class, cross-fading with the View Transitions API when available. */
const applyTheme = (theme: ResolvedTheme, animate: boolean) => {
  const root = document.documentElement;
  if (root.classList.contains("dark") === (theme === "dark")) return;
  const swap = () => root.classList.toggle("dark", theme === "dark");
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
  if (animate && !reduceMotion && typeof doc.startViewTransition === "function") {
    doc.startViewTransition(swap);
  } else {
    swap();
  }
};

export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const [preference, setPreferenceState] = React.useState<ThemePreference>(readPreference);
  const [resolved, setResolved] = React.useState<ResolvedTheme>(() => resolve(readPreference()));

  React.useEffect(() => {
    const query = systemQuery();
    const onChange = () => {
      if (preference !== "system") return;
      const next = resolve("system");
      setResolved(next);
      applyTheme(next, true);
    };
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, [preference]);

  const setPreference = React.useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // Ignore storage failures; the choice still applies for this visit.
    }
    const nextResolved = resolve(next);
    setResolved(nextResolved);
    applyTheme(nextResolved, true);
  }, []);

  const toggle = React.useCallback(() => {
    setPreference(resolve(readPreference()) === "dark" ? "light" : "dark");
  }, [setPreference]);

  const value = React.useMemo(() => ({ preference, resolved, setPreference, toggle }), [preference, resolved, setPreference, toggle]);

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

// eslint-disable-next-line react-refresh/only-export-components
export const useTheme = () => {
  const context = React.useContext(ThemeContext);
  if (!context) throw new Error("useTheme must be used inside ThemeProvider");
  return context;
};
