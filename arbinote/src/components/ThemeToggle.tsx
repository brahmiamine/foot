"use client";

import { useEffect, useState } from "react";

export default function ThemeToggle() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    setMounted(true);
    if (typeof window === "undefined") return;

    const stored = localStorage.getItem("arbinote-theme");
    const initialTheme = (stored as "light" | "dark") || "light";
    setTheme(initialTheme);

    const html = document.documentElement;
    if (initialTheme === "dark") {
      html.classList.add("dark");
    } else {
      html.classList.remove("dark");
    }
  }, []);

  useEffect(() => {
    if (!mounted || typeof document === "undefined" || typeof window === "undefined") return;

    const html = document.documentElement;
    if (theme === "dark") {
      localStorage.setItem("arbinote-theme", "dark");
      html.classList.add("dark");
    } else {
      localStorage.setItem("arbinote-theme", "light");
      html.classList.remove("dark");
    }
  }, [theme, mounted]);

  const toggleTheme = () => {
    const nextTheme = theme === "light" ? "dark" : "light";
    setTheme(nextTheme);
  };

  // Pendant le SSR et avant le montage, rendre un contenu par défaut identique
  if (!mounted) {
    return (
      <button
        type="button"
        className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        aria-label="Passer en mode sombre"
        suppressHydrationWarning
      >
        🌙
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className="px-3 py-1 rounded border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      aria-label={theme === "light" ? "Passer en mode sombre" : "Passer en mode clair"}
    >
      {theme === "light" ? "🌙" : "☀️"}
    </button>
  );
}
