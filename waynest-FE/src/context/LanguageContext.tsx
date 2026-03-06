import { createContext, useContext, useState } from "react";
import i18n from "../i18n";
import { useCookies } from "react-cookie";

interface LanguageContextType {
  language: string;
  toggleLanguage: (lang?: string) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const LanguageProvider = ({ children }: any) => {
  const [cookies, setCookie] = useCookies(["i18nextLng"]);

  const [language, setLanguage] = useState(() => {
    const lang = cookies.i18nextLng || "en";
    i18n.changeLanguage(lang);
    return lang;
  });

  const toggleLanguage = (lang?: string) => {
    setLanguage((prev: string) => {
      const newLang = lang;
      i18n.changeLanguage(newLang);
      setCookie("i18nextLng", newLang, {
        path: "/",
      });
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
