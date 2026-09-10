"use client";

import { useEffect, useState } from "react";
import { applyTheme, resolveTheme, type ThemeMode } from "@/lib/theme";

export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const [theme, setTheme] = useState<ThemeMode>("dark");
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setTheme(resolveTheme(localStorage.getItem("fabrica-theme")));
    setMounted(true);
  }, []);

  const toggle = () => {
    const next: ThemeMode = theme === "dark" ? "light" : "dark";
    setTheme(next);
    applyTheme(next);
  };

  if (!mounted) {
    return (
      <span
        className="inline-block h-8 w-8 rounded-lg border border-line/60"
        aria-hidden
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggle}
      title={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      aria-label={isDark ? "Ativar tema claro" : "Ativar tema escuro"}
      className={`inline-flex items-center justify-center rounded-lg border border-line text-muted transition hover:border-copper/40 hover:text-ink ${
        compact ? "h-8 w-8" : "gap-2 px-3 py-1.5 text-xs"
      }`}
    >
      {isDark ? (
        <SunIcon className="h-4 w-4 shrink-0" />
      ) : (
        <MoonIcon className="h-4 w-4 shrink-0" />
      )}
      {!compact ? <span>{isDark ? "Claro" : "Escuro"}</span> : null}
    </button>
  );
}

function SunIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="4" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  );
}

function MoonIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
    </svg>
  );
}
