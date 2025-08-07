import "./settings.css";
import { useChangeThemeContext } from "../../../../Context/ChangeTheme";
const SettingsPage = () => {
  //@ts-ignore
  const { theme, setTheme } = useChangeThemeContext();
  const toggleTheme = () => {
    const newTheme = theme === "light" ? "dark" : "light";
    localStorage.setItem("theme", newTheme);
    setTheme(newTheme);
  };
  return (
    <>
      <div className="settings-container">
        <div>SettingsPage</div>
        <button onClick={toggleTheme} className="changeThemeButton">
          Change Theme
        </button>
      </div>
    </>
  );
};

export default SettingsPage;
