"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { resolveTheme, type ThemeMode } from "@/lib/theme/resolve";

/**
 * KOORAKIT Theme_Engine provider (Req 7.2–7.4, 16.1, 16.2).
 *
 * Dark is the default theme. The root <html> element is rendered with
 * `data-theme="dark" class="dark"` in the server layout so the correct
 * tokens apply before paint.
 *
 * Light mode (Tier 3 Req 16.1): users can toggle between dark and light via
 * the `ThemeSwitcher`. The preference is persisted to both localStorage and a
 * cookie so it survives sessions and can be read server-side on future loads
 * (Req 16.2). When no preference is stored, resolves to dark (Property 13).
 */

const STORAGE_KEY = "kk-theme";

interface ThemeContextValue {
  theme: ThemeMode;
  setTheme: (mode: ThemeMode) => void;
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "dark",
  setTheme: () => {},
});

export function useTheme(): ThemeContextValue {
  return useContext(ThemeContext);
}

function getStoredPreference(): ThemeMode | null {
  if (typeof window === "undefined") return null;
  const val = localStorage.getItem(STORAGE_KEY);
  if (val === "dark" || val === "light") return val;
  return null;
}

function persistPreference(mode: ThemeMode): void {
  localStorage.setItem(STORAGE_KEY, mode);
  document.cookie = `${STORAGE_KEY}=${mode};path=/;max-age=31536000;SameSite=Lax`;
}

interface ThemeProviderProps {
  children: ReactNode;
  /** Server-read preference (from cookie). */
  preference?: ThemeMode | null;
}

export function ThemeProvider({ children, preference = null }: ThemeProviderProps) {
  const [theme, setThemeState] = useState<ThemeMode>(() =>
    resolveTheme(preference ?? getStoredPreference()),
  );

  const setTheme = useCallback((mode: ThemeMode) => {
    setThemeState(mode);
    persistPreference(mode);
  }, []);

  useEffect(() => {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.classList.toggle("dark", theme === "dark");
    root.classList.toggle("light", theme === "light");
  }, [theme]);

  return (
    <ThemeContext.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export default ThemeProvider;
