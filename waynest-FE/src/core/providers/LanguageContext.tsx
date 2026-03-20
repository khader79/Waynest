/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import i18n from "../i18n";
import { useCookies } from "react-cookie";

interface LanguageContextType {
  language: string;
  toggleLanguage: (lang?: string) => void;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [cookies, setCookie] = useCookies(["i18nextLng"]);

  const [language, setLanguage] = useState<string>(() => {
    const lang = cookies.i18nextLng || "en";
    i18n.changeLanguage(lang);
    return lang;
  });

  useEffect(() => {
    const dir = language === "ar" ? "rtl" : "ltr";
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language]);

  const toggleLanguage = (lang?: string) => {
    const newLang = lang ?? (language === 'ar' ? 'en' : 'ar');
    i18n.changeLanguage(newLang);
    setCookie("i18nextLng", newLang, {
      path: "/",
    });
    setLanguage(newLang);
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
