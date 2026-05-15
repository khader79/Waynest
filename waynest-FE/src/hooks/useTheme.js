import { useEffect, useMemo, useState } from "react";

export const THEME_STORAGE_KEY = "waynest-theme"; // values: 'light' | 'dark' | 'system'

const SUPPORTED_THEMES = new Set(["light", "dark", "system"]);

export const normalizeThemePreference = (value) =>
  SUPPORTED_THEMES.has(value) ? value : "system";

let currentThemePreference = "system";
let storageListenerAttached = false;
const listeners = new Set();

const readStoredTheme = () => {
  try {
    return normalizeThemePreference(localStorage.getItem(THEME_STORAGE_KEY));
  } catch {
    return "system";
  }
};

currentThemePreference =
  typeof window !== "undefined" ? readStoredTheme() : "system";

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

const persistThemePreference = (theme) => {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
};

const notifyThemeListeners = (theme) => {
  for (const listener of listeners) {
    listener(theme);
  }
};

const setThemePreference = (theme) => {
  const normalized = normalizeThemePreference(theme);
  currentThemePreference = normalized;
  applyThemePreference(normalized);
  persistThemePreference(normalized);
  notifyThemeListeners(normalized);
  return normalized;
};

const ensureStorageListener = () => {
  if (storageListenerAttached || typeof window === "undefined") {
    return;
  }

  storageListenerAttached = true;
  window.addEventListener("storage", (event) => {
    if (event.key !== THEME_STORAGE_KEY) {
      return;
    }

    const nextTheme = normalizeThemePreference(event.newValue);
    if (nextTheme === currentThemePreference) {
      return;
    }

    currentThemePreference = nextTheme;
    applyThemePreference(nextTheme);
    notifyThemeListeners(nextTheme);
  });
};

const subscribeThemePreference = (listener) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function useTheme() {
  const [theme, setTheme] = useState(() => currentThemePreference);
  const [resolvedTheme, setResolvedTheme] = useState(() =>
    getResolvedTheme(currentThemePreference),
  );

  useEffect(() => {
    ensureStorageListener();

    const syncTheme = (nextTheme) => {
      const normalized = normalizeThemePreference(nextTheme);
      setTheme(normalized);
      setResolvedTheme(applyThemePreference(normalized));
    };

    const unsubscribe = subscribeThemePreference(syncTheme);
    syncTheme(currentThemePreference);

    const mql = window.matchMedia?.("(prefers-color-scheme: dark)");
    const onChange = () => {
      if (currentThemePreference !== "system") {
        return;
      }

      setResolvedTheme(applyThemePreference("system"));
    };

    if (mql && currentThemePreference === "system") {
      mql.addEventListener
        ? mql.addEventListener("change", onChange)
        : mql.addListener(onChange);
    }

    return () => {
      unsubscribe();

      if (mql && currentThemePreference === "system") {
        mql.removeEventListener
          ? mql.removeEventListener("change", onChange)
          : mql.removeListener(onChange);
      }
    };
  }, []);

  const cycle = () => {
    const nextTheme =
      currentThemePreference === "system"
        ? getResolvedTheme("system") === "dark"
          ? "light"
          : "dark"
        : currentThemePreference === "dark"
          ? "light"
          : "dark";

    setThemePreference(nextTheme);
  };

  const updateTheme = (nextTheme) => {
    setThemePreference(nextTheme);
  };

  const label = useMemo(() => {
    if (theme === "system") return "system";
    return resolvedTheme;
  }, [resolvedTheme, theme]);

  return { theme, resolvedTheme, label, setTheme: updateTheme, cycle };
}

export default useTheme;
