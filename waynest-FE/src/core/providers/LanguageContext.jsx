/* eslint-disable react-refresh/only-export-components */
import { createContext, useCallback, useContext, useEffect, useState } from "react";
import i18n, { SUPPORTED_LANGUAGES, getLanguageDir } from "../i18n";
import { useCookies } from "react-cookie";









const LanguageContext = createContext(null);

const LanguageProvider = ({ children }) => {
  const [cookies, setCookie] = useCookies(["i18nextLng"]);

  const [language, setLanguage] = useState(() => {
    const lang = cookies.i18nextLng || "en";
    const validLang = SUPPORTED_LANGUAGES.find((l) => l.code === lang)?.code || "en";
    i18n.changeLanguage(validLang);
    return validLang;
  });

  const dir = getLanguageDir(language);
  const isRTL = dir === "rtl";

  useEffect(() => {
    document.documentElement.dir = dir;
    document.documentElement.lang = language;
  }, [language, dir]);

  const toggleLanguage = useCallback((lang) => {
    let newLang;

    if (lang) {
      newLang = lang;
    } else {
      // Cycle through languages if no specific lang provided
      const currentIndex = SUPPORTED_LANGUAGES.findIndex((l) => l.code === language);
      const nextIndex = (currentIndex + 1) % SUPPORTED_LANGUAGES.length;
      newLang = SUPPORTED_LANGUAGES[nextIndex].code;
    }

    i18n.changeLanguage(newLang);
    setCookie("i18nextLng", newLang, {
      path: "/",
      maxAge: 365 * 24 * 60 * 60, // 1 year
      sameSite: "lax"
    });
    setLanguage(newLang);
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
    </LanguageContext.Provider>);

};

const useLanguage = () => {
  const context = useContext(LanguageContext);

  if (!context)
  throw new Error("useLanguage must be used within LanguageProvider");

  return context;
};

export default LanguageProvider;
export { useLanguage };