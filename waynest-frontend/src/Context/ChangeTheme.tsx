import { createContext, useContext, useEffect, useState } from "react";

const changeTheme = createContext(undefined);
const ChangeThemeProvider = ({ children }: any) => {
  const [theme, setTheme] = useState(() => {
    return localStorage.getItem("theme") || "light";
  });
  useEffect(() => {
    localStorage.setItem("theme", theme);
  }, [theme]);
  return (
    //@ts-ignore
    <changeTheme.Provider value={{ theme, setTheme }}>
      {children}
    </changeTheme.Provider>
  );
};

export const useChangeThemeContext = () => {
  return useContext(changeTheme);
};

export default ChangeThemeProvider;
