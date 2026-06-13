"use client";

import { Moon, Sun } from "lucide-react";
import { useTheme } from "./ThemeProvider";

/**
 * Theme toggle switcher (Req 16.1, 16.2).
 * Allows users to switch between dark and light modes.
 * Persists selection to localStorage + cookie.
 */
export function ThemeSwitcher() {
  const { theme, setTheme } = useTheme();

  const toggle = () => {
    setTheme(theme === "dark" ? "light" : "dark");
  };

  return (
    <button
      onClick={toggle}
      className="p-2 rounded-lg text-foreground/60 hover:text-accent transition-colors"
      aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
    >
      {theme === "dark" ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
    </button>
  );
}
