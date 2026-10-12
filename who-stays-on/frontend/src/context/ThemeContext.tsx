import { createContext, useCallback, useEffect, useMemo, useState, type ReactNode } from "react";

export type Theme = "light" | "dark";
const KEY = "wo-theme";

function initial(): Theme {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === "light" || saved === "dark") return saved;
  } catch {
    /* storage blocked */
  }
  return window.matchMedia?.("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export const ThemeContext = createContext<{ theme: Theme; setTheme: (t: Theme) => void; toggle: () => void } | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [theme, setThemeState] = useState<Theme>(initial);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const setTheme = useCallback((t: Theme) => {
    setThemeState(t);
    try {
      localStorage.setItem(KEY, t);
    } catch {
      /* storage blocked */
    }
  }, []);
  const toggle = useCallback(() => setTheme(theme === "dark" ? "light" : "dark"), [theme, setTheme]);
  const value = useMemo(() => ({ theme, setTheme, toggle }), [theme, setTheme, toggle]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}
