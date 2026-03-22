/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import i18n, { SUPPORTED_LANGUAGES, getLanguageDir, type SupportedLanguage } from "../i18n";
import { useCookies } from "react-cookie";

interface LanguageContextType {
  language: SupportedLanguage;
  dir: "ltr" | "rtl";
  toggleLanguage: (lang?: string) => void;
  isRTL: boolean;
  availableLanguages: typeof SUPPORTED_LANGUAGES;
}

const LanguageContext = createContext<LanguageContextType | null>(null);

const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [cookies, setCookie] = useCookies(["i18nextLng"]);

  const [language, setLanguage] = useState<SupportedLanguage>(() => {
    const lang = (cookies.i18nextLng || "en") as SupportedLanguage;
    const validLang = SUPPORTED_LANGUAGES.find(l => l.code === lang)?.code || "en";
    i18n.changeLanguage(validLang);
    return validLang;
  });

  const dir = getLanguageDir(language);
  const isRTL = dir === "rtl";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  const toggleLanguage = useCallback((lang?: string) => {
    let newLang: string;
    
    if (lang) {
      newLang = lang;
    } else {
      // Cycle through languages if no specific lang provided
      const currentIndex = SUPPORTED_LANGUAGES.findIndex(l => l.code === language);
      const nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
      newLang = SUPPORTED_LANGUAGES[nextIndex].code;
    }
    
    i18n.changeLanguage(newLang);
    setCookie("i18nextLng", newLang, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: "lax",
    });
    setLanguage(newLang as SupportedLanguage);
  }, [language, setCookie]);

  return (
    <LanguageContext.Provider value={{ 
      language, 
      dir, 
      toggleLanguage, 
      isRTL,
      availableLanguages: SUPPORTED_LANGUAGES 
    }}>
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
