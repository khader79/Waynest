// React import not needed with the automatic JSX runtime
import { FiSun, FiMoon, FiMonitor } from "react-icons/fi";
import useTheme from "@/hooks/useTheme";
import "./ThemeToggle.css";

const labels = {
  system: "System theme",
  light: "Light theme",
  dark: "Dark theme",
};

const ThemeToggle = () => {
  const { theme, cycle } = useTheme();

  const icon =
    theme === "dark" ? (
      <FiMoon />
    ) : theme === "light" ? (
      <FiSun />
    ) : (
      <FiMonitor />
    );

  return (
    <button
      type="button"
      className="theme-toggle-btn"
      onClick={cycle}
      aria-label={labels[theme] || "Toggle theme"}
      title={labels[theme] || "Toggle theme"}>
      <span aria-hidden>{icon}</span>
    </button>
  );
};

export default ThemeToggle;
