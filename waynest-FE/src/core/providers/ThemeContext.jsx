/* eslint-disable react-refresh/only-export-components */
import { createContext, useState, useEffect, useContext } from "react";
import { useCookies } from "react-cookie";






const ThemeContext = createContext(null);

const ThemeProvider = ({ children }) => {
  const [cookies, setCookie] = useCookies(["theme"]);

  const [theme, setTheme] = useState(() => {
    const saved = cookies.theme;
    if (saved) return saved;
    return "light";
  });

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    setCookie("theme", theme);
  }, [setCookie, theme]);

  const toggleTheme = () => {
    setTheme((prev) => prev === "light" ? "dark" : "light");
  };

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      {children}
    </ThemeContext.Provider>);

};

const useTheme = () => {
  const context = useContext(ThemeContext);

  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }

  return context;
};
export { useTheme };
export default ThemeProvider;