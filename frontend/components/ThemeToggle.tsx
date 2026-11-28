"use client";

import { useEffect, useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

// Module-level listener store — toggle() notifies useSyncExternalStore directly
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => { listeners.delete(callback); };
}

function notify() {
  listeners.forEach((cb) => cb());
}

function readTheme(): boolean {
  if (typeof window === "undefined") return true;
  try {
    const stored = window.localStorage.getItem("spectrix-theme");
    return stored !== null ? stored === "dark" : true;
  } catch {
    return true;
  }
}

function getSnapshot(): boolean { return readTheme(); }
function getServerSnapshot(): boolean { return true; }

function applyTheme(dark: boolean) {
  if (dark) {
    document.documentElement.classList.add("dark");
  } else {
    document.documentElement.classList.remove("dark");
  }
}

export default function ThemeToggle() {
  const isDark = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    applyTheme(isDark);
  }, [isDark]);

  const toggle = () => {
    const next = !isDark;
    try {
      window.localStorage.setItem("spectrix-theme", next ? "dark" : "light");
    } catch { /* ignore */ }
    notify();
  };

  return (
    <button
      type="button"
      onClick={toggle}
      aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
      className="flex items-center justify-center w-8 h-8 rounded-lg
                 bg-slate-100 dark:bg-slate-800/80
                 border border-slate-300 dark:border-slate-700
                 text-slate-600 dark:text-slate-300
                 hover:bg-slate-200 dark:hover:bg-slate-700/80
                 hover:text-slate-900 dark:hover:text-white
                 transition-all duration-150"
    >
      {isDark ? <Moon size={15} /> : <Sun size={15} />}
    </button>
  );
}
