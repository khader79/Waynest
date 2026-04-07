import { createRoot } from "react-dom/client";
import "./styles/global.css";
import "./i18n";
import App from "./App";

(function initThemeFromStorage() {
  try {
    const stored = localStorage.getItem("waynest-theme");
    if (stored === "dark" || stored === "light") {
      document.documentElement.setAttribute("data-theme", stored);
      return;
    }
    if (window.matchMedia("(prefers-color-scheme: dark)").matches) {
      document.documentElement.setAttribute("data-theme", "dark");
    }
  } catch {
    /* ignore */
  }
})();

createRoot(document.getElementById("root")).render(<App />);
