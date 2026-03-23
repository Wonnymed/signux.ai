"use client";
import { useState, useEffect } from "react";

export type Theme = "auto" | "light" | "dark";

function getEffectiveScheme(theme: Theme): "light" | "dark" {
  if (theme !== "auto") return theme;
  if (typeof window !== "undefined") {
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  }
  return "light";
}

export function useTheme() {
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    const saved = localStorage.getItem("signux-theme") as Theme | null;
    if (saved) setTheme(saved);
    else setTheme("light");
  }, []);

  useEffect(() => {
    localStorage.setItem("signux-theme", theme);
    const scheme = getEffectiveScheme(theme);
    if (theme === "auto") {
      document.documentElement.removeAttribute("data-theme");
    } else {
      document.documentElement.setAttribute("data-theme", theme);
    }
    document.documentElement.style.colorScheme = scheme;
  }, [theme]);

  return { theme, setTheme };
}
