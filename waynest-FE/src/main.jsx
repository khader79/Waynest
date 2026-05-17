import { createRoot } from "react-dom/client";
import "./styles/global.css";
import i18n, { applyLanguageToDocument } from "./i18n";
import App from "./App";
import {
  applyThemePreference,
  normalizeThemePreference,
} from "@/hooks/useTheme";
// Enable a dev API mock when requested via localStorage.DEV_API_MOCK = '1'
if (process.env.NODE_ENV !== "production") {
  try {
    // dynamic import so this code is not bundled into production build
    import("./dev/devApiMock");
  } catch {
    /* ignore */
  }
}

(function initThemeFromStorage() {
  try {
    applyThemePreference(
      normalizeThemePreference(localStorage.getItem("waynest-theme")),
    );
  } catch {
    applyThemePreference("system");
  }
})();

const root = createRoot(document.getElementById("root"));
root.render(<App />);

// Apply current language direction to document and update on language changes
try {
  applyLanguageToDocument(i18n.language || i18n.resolvedLanguage);
  i18n.on("languageChanged", (lng) => applyLanguageToDocument(lng));
} catch (e) {
  /* ignore in non-browser environments */
}
