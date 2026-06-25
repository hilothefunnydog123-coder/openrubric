"use client";

import { useCallback, useEffect, useState } from "react";

/**
 * Dashboard theme preference (light / dark), persisted to localStorage and shared
 * across every dashboard surface in the tab via a window event. The `.dark` class is
 * applied to each dashboard wrapper (not <html>), so the marketing site stays light.
 *
 * First visit falls back to the OS preference; after that the user's choice sticks.
 */

export type Theme = "light" | "dark";

const KEY = "openrubric-theme";
const EVENT = "openrubric-theme-change";

function readTheme(): Theme {
  if (typeof window === "undefined") return "light";
  const saved = window.localStorage.getItem(KEY);
  if (saved === "dark" || saved === "light") return saved;
  try {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  } catch {
    return "light";
  }
}

export function useTheme() {
  // SSR-safe default; the real value is read on mount to avoid a hydration mismatch.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    setTheme(readTheme());
    const sync = () => setTheme(readTheme());
    window.addEventListener(EVENT, sync);
    window.addEventListener("storage", sync);
    return () => {
      window.removeEventListener(EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const setThemeValue = useCallback((next: Theme) => {
    window.localStorage.setItem(KEY, next);
    window.dispatchEvent(new Event(EVENT));
  }, []);

  const toggle = useCallback(() => {
    setThemeValue(readTheme() === "dark" ? "light" : "dark");
  }, [setThemeValue]);

  return { theme, toggle, setTheme: setThemeValue };
}
