"use client";

import { useCallback, useEffect, useState } from "react";

const KEY = "gb-theme";

export function useTheme() {
  const [theme, setThemeState] = useState<"dark" | "light">("dark");

  useEffect(() => {
    const t = localStorage.getItem(KEY) === "light" ? "light" : "dark";
    setThemeState(t);
    document.documentElement.dataset.theme = t;
  }, []);

  const toggle = useCallback(() => {
    setThemeState((prev) => {
      const next = prev === "dark" ? "light" : "dark";
      document.documentElement.dataset.theme = next;
      localStorage.setItem(KEY, next);
      return next;
    });
  }, []);

  return { theme, toggle };
}
