import { createContext, useContext, useEffect, useState } from "react";
import i18n from "../i18n";

interface LanguageContextType {
  language: string;
  toggleLanguage: () => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const LanguageProvider = ({ children }: any) => {
  const [language, setLanguage] = useState(() => {
    const lang = localStorage.getItem("i18nextLng");
    return lang || "en";
  });

  const toggleLanguage = () => {
    setLanguage((prev) => {
      const newLang = prev === "en" ? "ar" : "en";
      i18n.changeLanguage(newLang);
      localStorage.setItem("i18nextLng", newLang);

      return newLang;
    });
  };

  return (
    <LanguageContext.Provider value={{ language, toggleLanguage }}>
      {children}
    </LanguageContext.Provider>
  );
};

const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context)
    throw new Error("useLanguage must be used within LanguageProvider");

  return context;
};

export default LanguageProvider;
export { useLanguage };
