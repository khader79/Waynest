import { useEffect, useMemo, useState } from "react";

export const THEME_STORAGE_KEY = "waynest-theme"; // values: 'light' | 'dark' | 'system'

const SUPPORTED_THEMES = new Set(["light", "dark", "system"]);

export const normalizeThemePreference = (value) =>
  SUPPORTED_THEMES.has(value) ? value : "system";

export const getResolvedTheme = (theme) => {
  if (theme !== "system") {
    return theme === "dark" ? "dark" : "light";
  }

  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: dark)").matches
  ) {
    return "dark";
  }

  return "light";
};

export const applyThemePreference = (theme) => {
  if (typeof document === "undefined") {
    return "light";
  }

  const normalized = normalizeThemePreference(theme);
  const resolved = getResolvedTheme(normalized);
  const root = document.documentElement;

  root.setAttribute("data-theme", resolved);
  root.setAttribute("data-theme-preference", normalized);
  root.style.colorScheme = resolved;

  return resolved;
};

const getStored = () => {
  try {
    return normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
};

export function useTheme() {
  const [theme, setTheme] = useState(() => getStored());
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    getResolvedTheme(getStored()),
  );

  useEffect(() => {
    setResolvedTheme(applyThemePreference(theme));
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {}

    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    if (!mql) {
      return undefined;
    }

    const onChange = () => {
      setResolvedTheme(applyThemePreference(theme));
    };

    if (theme === "system") {
      mql.addEventListener
        ? mql.addEventListener("change", onChange)
        : mql.addListener(onChange);
      return () => {
        mql.removeEventListener
          ? mql.removeEventListener("change", onChange)
          : mql.removeListener(onChange);
      };
    }

    return undefined;
  }, [theme]);

  const cycle = () => {
    setTheme((t) => {
      if (t === "system") return "dark";
      if (t === "dark") return "light";
      return "system";
    });
  };

  const label = useMemo(() => {
    if (theme === "system") return "system";
    return resolvedTheme;
  }, [resolvedTheme, theme]);

  return { theme, resolvedTheme, label, setTheme, cycle };
}

export default useTheme;
