"use client";

import { Moon, Sun } from "lucide-react";
import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [dark, setDark] = useState(false);

  useEffect(() => {
    const savedTheme = window.localStorage.getItem("careeron-theme");
    const initialDark = savedTheme === "dark";
    document.documentElement.classList.toggle("dark", initialDark);
    setDark(initialDark);
  }, []);

  function toggleTheme() {
    const nextDark = !dark;
    document.documentElement.classList.toggle("dark", nextDark);
    window.localStorage.setItem("careeron-theme", nextDark ? "dark" : "light");
    setDark(nextDark);
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] text-muted transition hover:bg-[var(--surface-subtle)]"
      aria-label={dark ? "라이트 모드로 전환" : "다크 모드로 전환"}
      title={dark ? "라이트 모드" : "다크 모드"}
    >
      {dark ? <Sun size={17} /> : <Moon size={17} />}
    </button>
  );
}
