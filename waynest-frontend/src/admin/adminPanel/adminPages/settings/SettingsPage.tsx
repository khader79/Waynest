import { useState } from "react";
import AdminPanelMain from "../../AdminPanelMain";
import "./settings.css";
const SettingsPage = () => {
  const [isDark, setIsDark] = useState(false);
  return (
    <AdminPanelMain>
      <div className="settings-container">
        <div>SettingsPage</div>
        <button
          onClick={() => {
            const dark = !isDark;
            setIsDark(!isDark);
            localStorage.setItem("dark", String(dark));
          }}
          className="changeThemeButton"
        >
          Change Theme
        </button>
      </div>
    </AdminPanelMain>
  );
};

export default SettingsPage;
